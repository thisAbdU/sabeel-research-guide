import { requireUser } from '@/lib/auth'
import { error, json, options, readBody } from '@/lib/http'
import { toResearchProject } from '@/lib/mappers'
import { missingPublishFields, paymentConfigured, RESEARCH_COLUMNS } from '@/lib/research'
import { classifyDiscoverField, isDiscoverField } from '@/lib/research-fields'
import { extractPaperId, getScholarXivPaper } from '@/lib/scholarxiv'
import { parsePaymentMethods } from '@/lib/support'

export function OPTIONS() {
  return options()
}

/**
 * Create (or reuse) a research draft from a ScholarXiv URL, optionally save payment
 * methods, then publish to Discover when confirmPublish is true.
 */
export async function POST(request: Request) {
  const auth = await requireUser(request)
  if (!auth.ok) return auth.response

  const body = await readBody<{
    researchUrl?: string
    conversationId?: string | null
    researcherName?: string | null
    institution?: string | null
    location?: string | null
    field?: string | null
    paymentMethods?: unknown
    confirmPublish?: boolean
  }>(request)

  const researchUrl = body?.researchUrl?.trim()
  if (!researchUrl) return error('researchUrl is required')

  const paperId = extractPaperId(researchUrl)
  if (!paperId) return error('Provide a valid ScholarXiv or arXiv paper URL/ID')

  let paper
  try {
    paper = await getScholarXivPaper(paperId)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not fetch ScholarXiv metadata'
    return error(message, 502)
  }

  if (!paper?.title) return error('Could not extract paper metadata from ScholarXiv', 502)

  const researcherName =
    body?.researcherName?.trim() ||
    paper.authors[0] ||
    auth.user.email?.split('@')[0] ||
    'Researcher'

  const field = await classifyDiscoverField({
    title: paper.title,
    summary: paper.summary,
    preferred: body?.field && isDiscoverField(body.field.trim()) ? body.field.trim() : null,
  })
  const description = (paper.summary || paper.title).slice(0, 2000)
  const canonicalUrl = paper.url || researchUrl

  // Reuse draft with same research_url for this user when present
  const { data: existing } = await auth.supabase
    .from('research_projects')
    .select(RESEARCH_COLUMNS)
    .eq('user_id', auth.user.id)
    .eq('research_url', canonicalUrl)
    .maybeSingle()

  let projectId = existing?.id as string | undefined

  if (!projectId) {
    const { data: created, error: createError } = await auth.supabase
      .from('research_projects')
      .insert({
        user_id: auth.user.id,
        title: paper.title.slice(0, 300),
        researcher_name: researcherName,
        field,
        description,
        abstract: paper.summary || null,
        research_url: canonicalUrl,
        institution: body?.institution?.trim() || null,
        location: body?.location?.trim() || null,
        keywords: [],
        is_published: false,
      })
      .select(RESEARCH_COLUMNS)
      .single()

    if (createError || !created) {
      return error(createError?.message ?? 'Could not create research project', 500)
    }
    projectId = created.id
  } else if (existing && !existing.is_published) {
    await auth.supabase
      .from('research_projects')
      .update({
        title: paper.title.slice(0, 300),
        researcher_name: researcherName,
        field,
        description,
        abstract: paper.summary || null,
        institution: body?.institution?.trim() || existing.institution || null,
        location: body?.location?.trim() || existing.location || null,
      })
      .eq('id', projectId)
      .eq('user_id', auth.user.id)
  } else if (existing?.is_published) {
    // Re-classify so Discover chips stay accurate for older rows
    await auth.supabase
      .from('research_projects')
      .update({ field })
      .eq('id', projectId)
      .eq('user_id', auth.user.id)
  }

  if (body?.conversationId) {
    await auth.supabase
      .from('conversations')
      .update({ research_project_id: projectId })
      .eq('id', body.conversationId)
      .eq('user_id', auth.user.id)
  }

  // Reuse payment methods from another of the user's projects when not supplied
  if (body?.paymentMethods == null) {
    const { data: priorSupport } = await auth.supabase
      .from('support_settings')
      .select('payment_provider, payment_account_id, payment_account_name, payment_methods')
      .eq('user_id', auth.user.id)
      .not('payment_account_id', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (priorSupport && paymentConfigured(priorSupport)) {
      await auth.supabase.from('support_settings').upsert(
        {
          user_id: auth.user.id,
          research_project_id: projectId,
          enabled: false,
          payment_provider: priorSupport.payment_provider,
          payment_account_id: priorSupport.payment_account_id,
          payment_account_name: priorSupport.payment_account_name,
          payment_methods: priorSupport.payment_methods,
        },
        { onConflict: 'research_project_id' },
      )
    }
  }

  if (body?.paymentMethods != null) {
    const parsed = parsePaymentMethods(body.paymentMethods)
    if (!parsed.ok) return error(parsed.error)
    const primary = parsed.methods[0]
    const { error: supportError } = await auth.supabase.from('support_settings').upsert(
      {
        user_id: auth.user.id,
        research_project_id: projectId,
        enabled: false,
        payment_provider: primary.provider,
        payment_account_id: primary.accountId,
        payment_account_name: primary.accountName,
        payment_methods: parsed.methods,
      },
      { onConflict: 'research_project_id' },
    )
    if (supportError) return error(supportError.message, 500)
  }

  const { data: project, error: fetchError } = await auth.supabase
    .from('research_projects')
    .select(
      'id, title, researcher_name, field, description, abstract, research_url, institution, location, keywords, is_published, published_at, created_at, updated_at, support_settings(enabled, payment_provider, payment_account_id, payment_account_name, payment_methods)',
    )
    .eq('id', projectId)
    .eq('user_id', auth.user.id)
    .maybeSingle()

  if (fetchError) return error(fetchError.message, 500)
  if (!project) return error('Research project not found', 404)

  const supportRow = Array.isArray(project.support_settings)
    ? project.support_settings[0]
    : project.support_settings

  if (!body?.confirmPublish) {
    return json({
      data: {
        status: 'draft',
        project: toResearchProject(project, !!supportRow?.enabled),
        paper: {
          title: paper.title,
          url: canonicalUrl,
          authors: paper.authors,
          summary: paper.summary,
        },
        paymentConfigured: paymentConfigured(supportRow),
      },
    })
  }

  const missing = missingPublishFields(project)
  if (missing.length > 0) return error(`Missing public fields: ${missing.join(', ')}`)
  if (!paymentConfigured(supportRow)) {
    return error('Payment setup is required before publishing (Telebirr or bank details)')
  }

  const { error: supportEnableError } = await auth.supabase
    .from('support_settings')
    .update({ enabled: true })
    .eq('research_project_id', projectId)
    .eq('user_id', auth.user.id)

  if (supportEnableError) return error(supportEnableError.message, 500)

  const { error: publishError } = await auth.supabase
    .from('research_projects')
    .update({ is_published: true, published_at: new Date().toISOString() })
    .eq('id', projectId)
    .eq('user_id', auth.user.id)

  if (publishError) {
    await auth.supabase
      .from('support_settings')
      .update({ enabled: false })
      .eq('research_project_id', projectId)
      .eq('user_id', auth.user.id)
    return error(publishError.message, 500)
  }

  return json({
    data: {
      status: 'published',
      project: {
        id: projectId,
        title: project.title,
        visibility: 'public',
        supportEnabled: true,
        researchUrl: canonicalUrl,
      },
    },
  })
}
