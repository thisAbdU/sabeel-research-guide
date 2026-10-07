import type { SupabaseClient } from '@supabase/supabase-js'
import { error, json, options, readBody } from '@/lib/http'
import {
  linksEtErrorCode,
  linksEtErrorMessage,
  upstreamReceiptFromImage,
  verifyReceipt,
  verifyReceiptImage,
  type LinksEtVerifyFailure,
  type LinksEtVerifySuccess,
} from '@/lib/links-et'
import { toSupportTransaction } from '@/lib/mappers'
import { evaluateVerifiedPayment, methodsFromSettingsRow } from '@/lib/support'
import { requireAdminClient } from '@/lib/supabase/admin'

export const maxDuration = 120

export function OPTIONS() {
  return options()
}

/**
 * Verify a manual transfer via links.et (receipt URL / telebirr reference / screenshot).
 * Never stores receipt URLs or image bytes — only a hashed receipt fingerprint on success.
 */
export async function POST(request: Request) {
  const body = await readBody<{
    paymentId?: string
    url?: string
    reference?: string
    imageBase64?: string
  }>(request)

  const paymentId = body?.paymentId?.trim()
  if (!paymentId) return error('paymentId is required')

  const url = body?.url?.trim()
  const reference = body?.reference?.trim()
  const imageBase64 = body?.imageBase64?.trim()
  const provided = [url, reference, imageBase64].filter(Boolean).length
  if (provided !== 1) {
    return error('provide exactly one of url, reference, or imageBase64')
  }

  const admin = requireAdminClient()
  if (!admin.ok) return admin.response
  const supabase = admin.supabase

  const { data: tx, error: txError } = await supabase
    .from('support_transactions')
    .select('*, support_settings(*)')
    .eq('id', paymentId)
    .maybeSingle()

  if (txError) return error(txError.message, 500)
  if (!tx) return error('Payment not found', 404)

  if (tx.status === 'completed') {
    return json({
      data: {
        paymentId: tx.id,
        status: 'successful',
        transaction: toSupportTransaction(tx),
      },
    })
  }
  if (tx.status === 'cancelled') {
    return json(
      {
        data: {
          paymentId: tx.id,
          status: 'cancelled',
          transaction: toSupportTransaction(tx),
        },
      },
      409,
    )
  }
  if (tx.status === 'failed') {
    return json(
      {
        data: {
          paymentId: tx.id,
          status: 'failed',
          error: tx.failure_reason || 'Payment previously failed verification',
          transaction: toSupportTransaction(tx),
        },
      },
      409,
    )
  }

  const settingsRow = Array.isArray(tx.support_settings) ? tx.support_settings[0] : tx.support_settings
  const methods = methodsFromSettingsRow(settingsRow ?? {})
  if (!methods.length) {
    return error('Researcher payment details are missing', 400)
  }

  let verified: LinksEtVerifySuccess | null = null
  let upstreamStatus = 0

  try {
    if (imageBase64) {
      const { status, data } = await verifyReceiptImage(imageBase64, { idempotencyKey: paymentId })
      upstreamStatus = status
      verified = upstreamReceiptFromImage(data)
      if (!verified) {
        const err = data.error as LinksEtVerifyFailure['error'] | undefined
        const message = linksEtErrorMessage(err ?? 'could not verify receipt from screenshot')
        await markFailed(supabase, paymentId, message)
        return json(
          {
            data: {
              paymentId,
              status: 'failed',
              error: message,
              retryable: isRetryable(status, linksEtErrorCode(err ?? null)),
            },
          },
          422,
        )
      }
    } else {
      const { status, data } = await verifyReceipt(
        url ? { url } : { reference: reference! },
        { idempotencyKey: paymentId, awaitMs: 90_000 },
      )
      upstreamStatus = status

      // Still queued after await — tell the client to retry verify (idempotent).
      if (status === 202 || ('processingStatus' in data && !('ok' in data && data.ok))) {
        return json(
          {
            data: {
              paymentId,
              status: 'processing',
              requestId: 'requestId' in data ? data.requestId : null,
              retryable: true,
            },
          },
          202,
        )
      }

      if (!('ok' in data) || data.ok !== true) {
        const failure = data as LinksEtVerifyFailure
        const code = linksEtErrorCode(failure.error)
        const message = linksEtErrorMessage(failure.error)
        const retryable = isRetryable(status, code)
        if (!retryable) {
          await markFailed(supabase, paymentId, message)
        }
        return json(
          {
            data: {
              paymentId,
              status: 'failed',
              error: message,
              retryable,
            },
          },
          422,
        )
      }

      verified = data
    }
  } catch {
    return json(
      {
        data: {
          paymentId,
          status: 'failed',
          error: 'Verification service unavailable',
          retryable: true,
        },
      },
      503,
    )
  }

  const decision = evaluateVerifiedPayment({
    expectedAmount: Number(tx.amount),
    paymentReference: tx.payment_reference,
    methods,
    result: verified,
  })

  if (!decision.ok) {
    // Keep pending so the supporter can submit a different receipt; never mark successful.
    return json(
      {
        data: {
          paymentId,
          status: 'failed',
          error: decision.error,
          retryable: true,
        },
      },
      422,
    )
  }

  const { data: existing } = await supabase
    .from('support_transactions')
    .select('id')
    .eq('receipt_fingerprint', decision.fingerprint)
    .neq('id', paymentId)
    .maybeSingle()

  if (existing) {
    await markFailed(supabase, paymentId, 'receipt already used for another support payment')
    return json(
      {
        data: {
          paymentId,
          status: 'failed',
          error: 'receipt already used for another support payment',
          retryable: false,
        },
      },
      409,
    )
  }

  const source = typeof verified.receipt.source === 'string' ? verified.receipt.source : decision.provider
  const { data: updated, error: updateError } = await supabase
    .from('support_transactions')
    .update({
      status: 'completed',
      receipt_fingerprint: decision.fingerprint,
      receipt_source: source,
      verified_amount: decision.amount,
      verified_at: new Date().toISOString(),
      provider_payment_id: decision.fingerprint.slice(0, 32),
      failure_reason: null,
    })
    .eq('id', paymentId)
    .eq('status', 'pending')
    .select('*')
    .maybeSingle()

  if (updateError) {
    if (updateError.code === '23505') {
      await markFailed(supabase, paymentId, 'receipt already used for another support payment')
      return json(
        {
          data: {
            paymentId,
            status: 'failed',
            error: 'receipt already used for another support payment',
            retryable: false,
          },
        },
        409,
      )
    }
    return error(updateError.message, 500)
  }

  if (!updated) {
    const { data: current } = await supabase.from('support_transactions').select('*').eq('id', paymentId).single()
    if (current?.status === 'completed') {
      return json({
        data: {
          paymentId,
          status: 'successful',
          transaction: toSupportTransaction(current),
        },
      })
    }
    return json(
      {
        data: {
          paymentId,
          status: current?.status ?? 'failed',
          error: 'Payment could not be completed',
          retryable: false,
        },
      },
      409,
    )
  }

  return json({
    data: {
      paymentId,
      status: 'successful',
      transaction: toSupportTransaction(updated),
      upstreamStatus,
    },
  })
}

function isRetryable(status: number, code: string | null) {
  if (status === 401) return false
  if (code === 'invalid_json' || code === 'invalid_request') return false
  if (code === 'quota_exceeded' || code === 'image_cap_reached' || code === 'ai_not_configured') return false
  if (code === 'rate_limited' || code === 'provider_down' || code === 'ocr_daily_cap_reached') return true
  if (status === 502 || status === 503) return true
  if (status === 400 && !code) return true
  return false
}

async function markFailed(supabase: SupabaseClient, paymentId: string, reason: string) {
  await supabase
    .from('support_transactions')
    .update({
      status: 'failed',
      failure_reason: reason.slice(0, 300),
    })
    .eq('id', paymentId)
    .eq('status', 'pending')
}
