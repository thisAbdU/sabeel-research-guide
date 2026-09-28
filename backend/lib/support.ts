import { createHash, randomBytes } from 'node:crypto'
import type { LinksEtReceipt, LinksEtVerifySuccess } from '@/lib/links-et'

export const SUPPORT_PROVIDERS = [
  'telebirr',
  'cbe',
  'cbebirr',
  'mpesa',
  'boa',
  'dashen',
  'awash',
  'zemen',
  'coopay',
  'kaafi',
  'amhara',
  'abay',
  'oromia',
  'berhan',
  'ahadu',
  'siinqee',
  'zamzam',
] as const

export type SupportProvider = (typeof SUPPORT_PROVIDERS)[number]

export type PaymentMethod = {
  provider: SupportProvider
  accountId: string
  accountName: string
}

export type SupportTxStatus = 'pending' | 'completed' | 'failed' | 'cancelled'

const PROVIDER_SET = new Set<string>(SUPPORT_PROVIDERS)

const SOURCE_TO_PROVIDER: Record<string, SupportProvider> = {
  'telebirr-html': 'telebirr',
  'cbe-pdf': 'cbe',
  'mb-json': 'cbe',
  'cbebirr-pdf': 'cbebirr',
  'boa-json': 'boa',
  'zemen-pdf': 'zemen',
  'awash-html': 'awash',
  'dashen-pdf': 'dashen',
  'dashen-html': 'dashen',
  'mpesa-pdf': 'mpesa',
  'ebirr-html': 'coopay',
  'amhara-json': 'amhara',
  'abay-html': 'abay',
  'berhan-pdf': 'berhan',
  'oromia-pdf': 'oromia',
  'ahadu-pdf': 'ahadu',
  'siinqee-pdf': 'siinqee',
  'zamzam-json': 'zamzam',
}

export function isSupportProvider(value: string): value is SupportProvider {
  return PROVIDER_SET.has(value.trim().toLowerCase())
}

export function normalizeProvider(value: string): SupportProvider | null {
  const key = value.trim().toLowerCase().replace(/\s+/g, '')
  const aliases: Record<string, SupportProvider> = {
    telebirr: 'telebirr',
    cbe: 'cbe',
    cbebirr: 'cbebirr',
    'cbe-birr': 'cbebirr',
    mpesa: 'mpesa',
    'm-pesa': 'mpesa',
    boa: 'boa',
    bankofabyssinia: 'boa',
    dashen: 'dashen',
    dashenbank: 'dashen',
    awash: 'awash',
    awashbank: 'awash',
    zemen: 'zemen',
    zemenbank: 'zemen',
    coopay: 'coopay',
    coopayebirr: 'coopay',
    ebirr: 'coopay',
    kaafi: 'kaafi',
    kaafiebirr: 'kaafi',
    amhara: 'amhara',
    amharabank: 'amhara',
    abay: 'abay',
    abaybank: 'abay',
    oromia: 'oromia',
    oromiabank: 'oromia',
    berhan: 'berhan',
    berhanbank: 'berhan',
    ahadu: 'ahadu',
    ahadubank: 'ahadu',
    siinqee: 'siinqee',
    siinqeebank: 'siinqee',
    zamzam: 'zamzam',
    zamzambank: 'zamzam',
  }
  return aliases[key] ?? (isSupportProvider(key) ? key : null)
}

export function parsePaymentMethods(input: unknown): { ok: true; methods: PaymentMethod[] } | { ok: false; error: string } {
  if (!Array.isArray(input) || input.length === 0) {
    return { ok: false, error: 'at least one payment method is required' }
  }
  if (input.length > 8) return { ok: false, error: 'too many payment methods' }

  const methods: PaymentMethod[] = []
  const seen = new Set<string>()

  for (const row of input) {
    if (!row || typeof row !== 'object') return { ok: false, error: 'invalid payment method' }
    const raw = row as Record<string, unknown>
    const providerRaw = typeof raw.provider === 'string' ? raw.provider : typeof raw.paymentMethod === 'string' ? raw.paymentMethod : ''
    const provider = normalizeProvider(providerRaw)
    const accountId =
      typeof raw.accountId === 'string'
        ? raw.accountId.trim()
        : typeof raw.paymentAccountId === 'string'
          ? raw.paymentAccountId.trim()
          : ''
    const accountName =
      typeof raw.accountName === 'string'
        ? raw.accountName.trim()
        : typeof raw.paymentAccountName === 'string'
          ? raw.paymentAccountName.trim()
          : ''

    if (!provider) return { ok: false, error: `unsupported provider: ${providerRaw || '(empty)'}` }
    if (!accountId) return { ok: false, error: 'accountId is required' }
    if (!accountName) return { ok: false, error: 'accountName is required' }
    if (accountId.length > 64 || accountName.length > 120) {
      return { ok: false, error: 'payment method fields are too long' }
    }

    const key = `${provider}:${accountId}`
    if (seen.has(key)) continue
    seen.add(key)
    methods.push({ provider, accountId, accountName })
  }

  if (!methods.length) return { ok: false, error: 'at least one payment method is required' }
  return { ok: true, methods }
}

export function methodsFromSettingsRow(row: {
  payment_provider?: string | null
  payment_account_id?: string | null
  payment_account_name?: string | null
  payment_methods?: unknown
}): PaymentMethod[] {
  if (Array.isArray(row.payment_methods) && row.payment_methods.length) {
    const parsed = parsePaymentMethods(row.payment_methods)
    if (parsed.ok) return parsed.methods
  }

  const provider = row.payment_provider ? normalizeProvider(row.payment_provider) : null
  const accountId = row.payment_account_id?.trim() || ''
  const accountName = row.payment_account_name?.trim() || accountId
  if (provider && accountId) {
    return [{ provider, accountId, accountName: accountName || accountId }]
  }
  return []
}

export function publicCheckoutMethods(methods: PaymentMethod[]) {
  return methods.map((method) => ({
    provider: method.provider,
    accountId: method.accountId,
    accountName: method.accountName,
  }))
}

export function createPaymentReference() {
  return `SBL-${randomBytes(6).toString('hex').toUpperCase()}`
}

export function parseReceiptAmount(receipt: LinksEtReceipt): number | null {
  const candidates = [
    receipt.settledAmount,
    receipt.transferredAmount,
    receipt.amount,
    receipt.totalAmount,
    receipt.totalAmountPaid,
    typeof receipt.transaction === 'object' && receipt.transaction
      ? (receipt.transaction as Record<string, unknown>).amount
      : undefined,
    receipt.totalPaidAmount,
  ]

  for (const value of candidates) {
    const amount = coerceAmount(value)
    if (amount != null && amount > 0) return amount
  }
  return null
}

function coerceAmount(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') return null
  const cleaned = value.replace(/,/g, '').replace(/[^\d.]/g, ' ').trim()
  const match = cleaned.match(/(\d+(?:\.\d+)?)/)
  if (!match) return null
  const amount = Number(match[1])
  return Number.isFinite(amount) ? amount : null
}

export function amountsMatch(expected: number, actual: number, tolerance = 0.5) {
  return Math.abs(expected - actual) <= tolerance
}

export function receiptIdentity(result: LinksEtVerifySuccess): string | null {
  const receipt = result.receipt
  const parts = [
    result.providerKey,
    typeof receipt.source === 'string' ? receipt.source : '',
    stringField(receipt, 'receiptNo'),
    stringField(receipt, 'reference'),
    stringField(receipt, 'paymentReference'),
    stringField(receipt, 'transactionId'),
    stringField(receipt, 'paymentOrderNumber'),
    nestedString(receipt, 'transaction', 'transactionId'),
  ].filter(Boolean)

  if (parts.length < 2) {
    // Fall back to resolved URL path only as a last resort — hashed, never stored raw.
    const url = result.resolvedUrl?.trim()
    if (!url) return null
    parts.push(url)
  }

  return createHash('sha256').update(parts.join('|')).digest('hex')
}

function stringField(receipt: LinksEtReceipt, key: string) {
  const value = receipt[key]
  return typeof value === 'string' && value.trim() ? value.trim() : ''
}

function nestedString(receipt: LinksEtReceipt, parent: string, key: string) {
  const node = receipt[parent]
  if (!node || typeof node !== 'object') return ''
  const value = (node as Record<string, unknown>)[key]
  return typeof value === 'string' && value.trim() ? value.trim() : ''
}

export function providerFromReceipt(result: LinksEtVerifySuccess): SupportProvider | null {
  const source = typeof result.receipt.source === 'string' ? result.receipt.source : ''
  if (source && SOURCE_TO_PROVIDER[source]) return SOURCE_TO_PROVIDER[source]
  return normalizeProvider(result.providerKey)
}

function normalizeName(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function digitsOnly(value: string) {
  return value.replace(/\D/g, '')
}

function receiverHints(receipt: LinksEtReceipt) {
  const names = [
    stringField(receipt, 'creditedPartyName'),
    stringField(receipt, 'receiverName'),
    stringField(receipt, 'beneficiaryName'),
    nestedString(receipt, 'customer', 'name'),
  ].filter(Boolean)

  const accounts = [
    stringField(receipt, 'creditedPartyAccountNo'),
    stringField(receipt, 'receiverAccount'),
    stringField(receipt, 'beneficiaryAccount'),
    nestedString(receipt, 'customer', 'accountNo'),
    nestedString(receipt, 'transaction', 'receiverAccount'),
  ].filter(Boolean)

  return { names, accounts }
}

export function recipientMatches(receipt: LinksEtReceipt, methods: PaymentMethod[]): boolean {
  const { names, accounts } = receiverHints(receipt)
  if (!names.length && !accounts.length) {
    // Some providers (e.g. BoA) hide payer but show receiver; if neither side is present, skip.
    return true
  }

  for (const method of methods) {
    const wantName = normalizeName(method.accountName)
    const wantDigits = digitsOnly(method.accountId)

    const nameOk =
      !names.length ||
      names.some((name) => {
        const got = normalizeName(name)
        return got === wantName || got.includes(wantName) || wantName.includes(got)
      })

    const accountOk =
      !accounts.length ||
      !wantDigits ||
      accounts.some((account) => {
        const got = digitsOnly(account)
        if (!got) return false
        // Masked accounts only expose a few digits — require overlapping suffix/prefix.
        const slice = Math.min(4, wantDigits.length, got.length)
        if (slice < 3) return wantDigits.includes(got) || got.includes(wantDigits)
        return (
          wantDigits.endsWith(got.slice(-slice)) ||
          got.endsWith(wantDigits.slice(-slice)) ||
          wantDigits.startsWith(got.slice(0, slice)) ||
          got.startsWith(wantDigits.slice(0, slice))
        )
      })

    if (nameOk && accountOk) return true
  }

  return false
}

export function paymentReasonMentions(receipt: LinksEtReceipt, paymentReference: string) {
  const reason = [
    stringField(receipt, 'paymentReason'),
    stringField(receipt, 'narrative'),
    nestedString(receipt, 'transaction', 'paymentReason'),
    nestedString(receipt, 'transaction', 'remark'),
  ]
    .join(' ')
    .toUpperCase()
  return reason.includes(paymentReference.toUpperCase())
}

export function evaluateVerifiedPayment(input: {
  expectedAmount: number
  paymentReference: string
  methods: PaymentMethod[]
  result: LinksEtVerifySuccess
}): { ok: true; amount: number; provider: SupportProvider; fingerprint: string } | { ok: false; error: string } {
  if (input.result.ok !== true) return { ok: false, error: 'receipt was not verified' }

  const provider = providerFromReceipt(input.result)
  if (!provider) return { ok: false, error: 'unsupported receipt provider' }

  const allowed = new Set(input.methods.map((method) => method.provider))
  // ebirr covers coopay + kaafi
  if (provider === 'coopay' && (allowed.has('coopay') || allowed.has('kaafi'))) {
    // ok
  } else if (!allowed.has(provider)) {
    return { ok: false, error: 'receipt provider does not match researcher payment methods' }
  }

  const amount = parseReceiptAmount(input.result.receipt)
  if (amount == null) return { ok: false, error: 'could not read amount from receipt' }
  if (!amountsMatch(input.expectedAmount, amount)) {
    return { ok: false, error: 'receipt amount does not match support amount' }
  }

  const mentioned = paymentReasonMentions(input.result.receipt, input.paymentReference)
  const recipientOk = recipientMatches(input.result.receipt, input.methods)
  if (!mentioned && !recipientOk) {
    return { ok: false, error: 'receipt recipient does not match researcher payment details' }
  }

  const fingerprint = receiptIdentity(input.result)
  if (!fingerprint) return { ok: false, error: 'could not identify receipt securely' }

  return { ok: true, amount, provider, fingerprint }
}

export function sanitizeSupporterName(name: string | null | undefined, anonymous: boolean) {
  if (anonymous) return null
  const trimmed = name?.trim() || ''
  if (!trimmed) return null
  return trimmed.slice(0, 80)
}
