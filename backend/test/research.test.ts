import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { missingPublishFields, readSupportEnabled, researchColumns } from '@/lib/research'

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
})
