import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  amountsMatch,
  evaluateVerifiedPayment,
  normalizeProvider,
  parsePaymentMethods,
  parseReceiptAmount,
  recipientMatches,
} from '@/lib/support'
import { linksEtRetryDelayMs } from '@/lib/links-et'

describe('support payment helpers', () => {
  it('normalizes known Ethiopian providers from links.et', () => {
    assert.equal(normalizeProvider('Telebirr'), 'telebirr')
    assert.equal(normalizeProvider('CBE Birr'), 'cbebirr')
    assert.equal(normalizeProvider('M-PESA'), 'mpesa')
    assert.equal(normalizeProvider('COOPay Ebirr'), 'coopay')
    assert.equal(normalizeProvider('Bank of Abyssinia'), 'boa')
    assert.equal(normalizeProvider('not-a-bank'), null)
  })

  it('parses payment methods and requires account name', () => {
    const bad = parsePaymentMethods([{ provider: 'telebirr', accountId: '0911' }])
    assert.equal(bad.ok, false)

    const ok = parsePaymentMethods([
      { provider: 'telebirr', accountId: '0911223344', accountName: 'Ada Lovelace' },
      { provider: 'cbe', accountId: '1000123456789', accountName: 'Ada Lovelace' },
    ])
    assert.equal(ok.ok, true)
    if (!ok.ok) return
    assert.equal(ok.methods.length, 2)
  })

  it('parses receipt amounts across string and number shapes', () => {
    assert.equal(parseReceiptAmount({ settledAmount: '100 Birr' }), 100)
    assert.equal(parseReceiptAmount({ transferredAmount: 250 }), 250)
    assert.equal(parseReceiptAmount({ transaction: { amount: '100 ETB' } }), 100)
    assert.equal(parseReceiptAmount({ totalPaidAmount: 'ETB50.00' }), 50)
    assert.equal(parseReceiptAmount({}), null)
  })

  it('matches recipient using name or masked account digits', () => {
    const methods = [
      { provider: 'telebirr' as const, accountId: '251911223344', accountName: 'Ada Lovelace' },
    ]
    assert.equal(
      recipientMatches({ creditedPartyName: 'Ada Lovelace', creditedPartyAccountNo: '251********' }, methods),
      true,
    )
    assert.equal(
      recipientMatches({ receiverName: 'Someone Else', receiverAccount: '1000****789' }, methods),
      false,
    )
  })

  it('accepts a verified tip only when amount and recipient/reference line up', () => {
    const methods = [
      { provider: 'telebirr' as const, accountId: '251911223344', accountName: 'Ada Lovelace' },
    ]
    const result = evaluateVerifiedPayment({
      expectedAmount: 100,
      paymentReference: 'SBL-ABC123',
      methods,
      result: {
        ok: true,
        providerKey: 'telebirr',
        resolvedUrl: 'https://transactioninfo.ethiotelecom.et/receipt/ABCD1234EF',
        httpStatus: 200,
        fetchedAt: '2026-01-01T00:00:00.000Z',
        error: null,
        receipt: {
          source: 'telebirr-html',
          settledAmount: '100 Birr',
          creditedPartyName: 'Ada Lovelace',
          receiptNo: 'ABCD1234EF',
          transactionStatus: 'Completed',
        },
      },
    })
    assert.equal(result.ok, true)

    const wrongAmount = evaluateVerifiedPayment({
      expectedAmount: 100,
      paymentReference: 'SBL-ABC123',
      methods,
      result: {
        ok: true,
        providerKey: 'telebirr',
        resolvedUrl: 'https://transactioninfo.ethiotelecom.et/receipt/ABCD1234EF',
        httpStatus: 200,
        fetchedAt: '2026-01-01T00:00:00.000Z',
        error: null,
        receipt: {
          source: 'telebirr-html',
          settledAmount: '50 Birr',
          creditedPartyName: 'Ada Lovelace',
          receiptNo: 'ABCD1234EF',
        },
      },
    })
    assert.equal(wrongAmount.ok, false)
  })

  it('amount tolerance stays tight', () => {
    assert.equal(amountsMatch(100, 100.4), true)
    assert.equal(amountsMatch(100, 101), false)
  })

  it('links.et retry rules separate rate limits from quotas', () => {
    assert.equal(linksEtRetryDelayMs(401, 'invalid_key', null), null)
    assert.equal(linksEtRetryDelayMs(429, 'quota_exceeded', 86400), null)
    assert.ok((linksEtRetryDelayMs(429, 'rate_limited', 2) ?? 0) >= 2000)
    assert.ok((linksEtRetryDelayMs(502, null, null) ?? 0) >= 1000)
  })
})
