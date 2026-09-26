import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  discoverSearchFilter,
  exactFilter,
  missingPublishFields,
  paymentConfigured,
  readSupportEnabled,
  researchColumns,
  supportUpdate,
  visibleOnDiscover,
} from '@/lib/research'

describe('research publishing', () => {
  it('create stays private and rejects a visibility field', () => {
    const rejected = researchColumns({ title: 'AI tutors', visibility: 'public' }, { titleRequired: true })
    assert.equal(rejected.ok, false)

    const created = researchColumns(
      {
        title: 'AI tutors',
        researcherName: 'Ada',
        field: 'Education',
        description: 'How tutors affect retention.',
        researchUrl: 'https://example.com/paper',
        keywords: ['AI', ''],
      },
      { titleRequired: true },
    )
    assert.equal(created.ok, true)
    if (!created.ok) return
    assert.equal(created.columns.is_published, undefined)
    assert.deepEqual(created.columns.keywords, ['AI'])
  })

  it('publish requires the public card fields', () => {
    assert.deepEqual(
      missingPublishFields({ title: 'T', researcher_name: null, field: 'Education', description: 'D' }),
      ['researcherName'],
    )
    assert.deepEqual(
      missingPublishFields({
        title: 'T',
        researcher_name: 'Ada',
        field: 'Education',
        description: 'D',
      }),
      [],
    )
  })

  it('support stays off until a settings row is enabled', () => {
    assert.equal(readSupportEnabled(null), false)
    assert.equal(readSupportEnabled({ enabled: false }), false)
    assert.equal(readSupportEnabled([{ enabled: true }]), true)
  })

  it('discover shows a project only when it is public and support is on', () => {
    assert.equal(visibleOnDiscover(false, false), false)
    assert.equal(visibleOnDiscover(true, false), false)
    assert.equal(visibleOnDiscover(false, true), false)
    assert.equal(visibleOnDiscover(true, true), true)
  })

  it('support cannot turn on without payment, or off while public', () => {
    assert.equal(paymentConfigured({ payment_provider: 'links_et', payment_account_id: '' }), false)
    assert.equal(paymentConfigured({ payment_provider: 'links_et', payment_account_id: 'acct_1' }), true)

    const unpaid = supportUpdate({
      enabled: true,
      paymentProvider: 'links_et',
      paymentAccountId: null,
      projectPublished: true,
    })
    assert.equal(unpaid.ok, false)

    const disablePublic = supportUpdate({
      enabled: false,
      paymentProvider: 'links_et',
      paymentAccountId: 'acct_1',
      projectPublished: true,
    })
    assert.equal(disablePublic.ok, false)

    const ready = supportUpdate({
      enabled: false,
      paymentProvider: 'links_et',
      paymentAccountId: 'acct_1',
      projectPublished: false,
    })
    assert.equal(ready.ok, true)
  })

  it('search matches the card fields and ignores wildcard input', () => {
    assert.equal(discoverSearchFilter('  '), null)
    assert.equal(exactFilter('%,'), null)
    assert.equal(
      discoverSearchFilter('AI tutors'),
      'title.ilike."%AI tutors%",researcher_name.ilike."%AI tutors%",description.ilike."%AI tutors%",field.ilike."%AI tutors%"',
    )
  })
})
