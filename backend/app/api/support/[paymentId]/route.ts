import { error, json, options, readBody } from '@/lib/http'
import { toSupportTransaction } from '@/lib/mappers'
import { requireAdminClient } from '@/lib/supabase/admin'

export function OPTIONS() {
  return options()
}

type Ctx = { params: Promise<{ paymentId: string }> }

/** Payment status for the support modal (pending / successful / failed / cancelled). */
export async function GET(_request: Request, ctx: Ctx) {
  const { paymentId } = await ctx.params
  if (!paymentId) return error('paymentId is required')

  const admin = requireAdminClient()
  if (!admin.ok) return admin.response

  const { data, error: readError } = await admin.supabase
    .from('support_transactions')
    .select('*')
    .eq('id', paymentId)
    .maybeSingle()

  if (readError) return error(readError.message, 500)
  if (!data) return error('Payment not found', 404)

  return json({
    data: {
      paymentId: data.id,
      status: publicStatus(data.status),
      amount: Number(data.amount),
      currency: data.currency,
      paymentReference: data.payment_reference,
      failureReason: data.status === 'failed' ? data.failure_reason : null,
      transaction: toSupportTransaction(data),
    },
  })
}

/** Cancel a pending tip before verification — never invents a success state. */
export async function POST(request: Request, ctx: Ctx) {
  const { paymentId } = await ctx.params
  if (!paymentId) return error('paymentId is required')

  const body = await readBody<{ action?: string }>(request)
  if (body?.action && body.action !== 'cancel') return error('unsupported action')

  const admin = requireAdminClient()
  if (!admin.ok) return admin.response

  const { data: current, error: readError } = await admin.supabase
    .from('support_transactions')
    .select('*')
    .eq('id', paymentId)
    .maybeSingle()

  if (readError) return error(readError.message, 500)
  if (!current) return error('Payment not found', 404)

  if (current.status === 'completed') {
    return json(
      {
        data: {
          paymentId,
          status: 'successful',
          transaction: toSupportTransaction(current),
        },
      },
      409,
    )
  }
  if (current.status === 'cancelled') {
    return json({
      data: {
        paymentId,
        status: 'cancelled',
        transaction: toSupportTransaction(current),
      },
    })
  }
  if (current.status !== 'pending') {
    return json(
      {
        data: {
          paymentId,
          status: publicStatus(current.status),
          transaction: toSupportTransaction(current),
        },
      },
      409,
    )
  }

  const { data, error: updateError } = await admin.supabase
    .from('support_transactions')
    .update({ status: 'cancelled', failure_reason: 'cancelled by supporter' })
    .eq('id', paymentId)
    .eq('status', 'pending')
    .select('*')
    .maybeSingle()

  if (updateError) return error(updateError.message, 500)
  if (!data) return error('Payment could not be cancelled', 409)

  return json({
    data: {
      paymentId,
      status: 'cancelled',
      transaction: toSupportTransaction(data),
    },
  })
}

function publicStatus(status: string) {
  if (status === 'completed') return 'successful'
  return status
}
