# ScholarXiv Research Companion — API Contracts

**Status:** Draft — Day 1
**Version:** 0.1
**Last Updated:** Day 1
**Owner:** Backend + AI
**Frontend Consumer:** Next.js frontend

> This document defines the agreed interface between the frontend and backend.
>
> The backend implementation may change internal details, but changes to request/response shapes should be discussed with the frontend developer before implementation.
>
> **Important:** This is a draft. Verify and modify the external integration sections after checking the current ScholarXiv, Voxide, and Links.et APIs.

---

# 1. Architecture

```text
┌─────────────────────────────┐
│        Next.js Frontend     │
│                             │
│ Chat / Vent / Roast /       │
│ Funding / Discover /        │
│ Dashboard / Support / Voice │
└──────────────┬──────────────┘
               │
               │ HTTP / JSON
               ▼
┌─────────────────────────────┐
│       Next.js Backend       │
│       Route Handlers        │
│                             │
│ Auth / Validation /         │
│ Business Logic / APIs       │
└──────┬───────┬──────┬───────┘
       │       │      │
       ▼       ▼      ▼
   Gemini   ScholarXiv Supabase
      │         │       │
      │         │       │
      └────┬────┴───────┘
           │
           ▼
     AI Research Flow
           
Additional integrations:

Backend → Voxide
Backend → Links.et
```

---

# 2. General API Rules

## Base URL

Development:

```text
http://localhost:3000
```

Production:

```text
TBD
```

All API routes use:

```text
/api/*
```

Example:

```text
POST /api/chat
```

---

# 3. Content Type

Requests containing JSON must use:

```http
Content-Type: application/json
```

Responses should normally use:

```http
Content-Type: application/json
```

---

# 4. Authentication

Authenticated endpoints should use the current Supabase authenticated user.

The frontend should **not** send:

```json
{
  "userId": "..."
}
```

as a trusted identity value.

The backend should obtain the authenticated user from Supabase Auth/session.

The backend must verify ownership before modifying private resources.

---

# 5. Common Response Format

Successful responses should return JSON.

For successful requests:

```json
{
  "data": {}
}
```

For errors:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

Example:

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "You must be logged in to perform this action."
  }
}
```

---

# 6. HTTP Status Codes

Use standard HTTP status codes.

| Status | Meaning                       |
| ------ | ----------------------------- |
| 200    | Successful request            |
| 201    | Resource created              |
| 400    | Invalid request               |
| 401    | Not authenticated             |
| 403    | Authenticated but not allowed |
| 404    | Resource not found            |
| 409    | Conflict                      |
| 422    | Validation error              |
| 429    | Rate limit                    |
| 500    | Internal server error         |
| 502    | External service failure      |

---

# 7. Core Types

## Mode

```ts
type ChatMode = "vent" | "roast" | "funding";
```

---

## Message Role

```ts
type MessageRole = "user" | "assistant";
```

---

## Visibility

```ts
type ResearchVisibility = "private" | "public";
```

MVP rule:

```text
private + support disabled
public + support enabled
```

A research project should NOT become public merely because the frontend sends:

```json
{
  "visibility": "public"
}
```

The backend controls publishing.

---

# 8. POST /api/chat

Main endpoint for the AI research companion.

This endpoint handles:

* Vent
* Roast
* Get Funding

The backend determines the appropriate workflow from `mode`.

---

## Request

```json
{
  "mode": "vent",
  "conversationId": "conversation-123",
  "message": "I want to research AI and education but I don't know exactly what to study."
}
```

### Fields

| Field          | Type                             | Required | Description           |
| -------------- | -------------------------------- | -------: | --------------------- |
| mode           | `"vent" \| "roast" \| "funding"` |      Yes | Current chatbot mode  |
| conversationId | string | null                    |       No | Existing conversation |
| message        | string                           |      Yes | User's message        |

For a new conversation:

```json
{
  "mode": "vent",
  "conversationId": null,
  "message": "I want to research AI and education."
}
```

---

# 9. Chat Response

Recommended response shape:

```json
{
  "data": {
    "conversationId": "conversation-123",
    "message": {
      "id": "message-456",
      "role": "assistant",
      "content": "Let's narrow this down. Are you more interested in university students, school students, or teachers?",
      "createdAt": "2026-09-21T10:00:00Z"
    },
    "sources": [],
    "researchDirections": []
  }
}
```

---

# 10. Chat Source

Sources returned by ScholarXiv should follow a consistent shape.

```json
{
  "id": "paper-123",
  "title": "AI and Student Learning Outcomes",
  "authors": [
    "Author One",
    "Author Two"
  ],
  "summary": "This study examines...",
  "url": "https://example.com/paper",
  "source": "ScholarXiv"
}
```

TypeScript:

```ts
type ResearchSource = {
  id: string;
  title: string;
  authors: string[];
  summary?: string;
  url: string;
  source: string;
};
```

---

# 11. Vent Workflow

Vent is for users who have an unclear research idea.

Example:

```text
User:
"I want to research AI and education."

Backend:
1. Send conversation/context to Gemini.
2. Gemini identifies missing dimensions.
3. Ask useful follow-up questions.
4. When enough context exists, search ScholarXiv.
5. Give research-grounded directions.
6. Return sources.
```

The AI should help narrow:

* Field
* Population
* Geography
* Problem
* Context
* Outcome
* Research gap
* Research question

---

## Vent Response

When useful, the backend may return:

```json
{
  "data": {
    "conversationId": "conversation-123",
    "message": {
      "id": "message-456",
      "role": "assistant",
      "content": "Based on what you've told me, we can narrow this toward university students using AI learning tools.",
      "createdAt": "2026-09-21T10:00:00Z"
    },
    "sources": [
      {
        "id": "paper-1",
        "title": "AI in Higher Education",
        "authors": ["Author One"],
        "summary": "Research on...",
        "url": "https://example.com",
        "source": "ScholarXiv"
      }
    ],
    "researchDirections": [
      {
        "title": "AI tutoring and university students",
        "description": "Study how...",
        "researchQuestion": "How does..."
      }
    ]
  }
}
```

Research direction type:

```ts
type ResearchDirection = {
  title: string;
  description: string;
  researchQuestion: string;
};
```

---

# 12. Roast Workflow

Roast receives an existing research idea.

Example:

```text
User:
"The impact of social media on students."
```

Backend:

```text
User idea
   ↓
Gemini
   ↓
Analyze research idea
   ↓
ScholarXiv search
   ↓
Compare against existing research
   ↓
Identify weaknesses / over-breadth / missing context
   ↓
Generate improved research questions
```

---

## Roast Response

```json
{
  "data": {
    "conversationId": "conversation-123",
    "message": {
      "id": "message-789",
      "role": "assistant",
      "content": "Okay... this topic is trying to study literally everything 😭",
      "createdAt": "2026-09-21T10:00:00Z"
    },
    "roast": {
      "problems": [
        "The topic is too broad.",
        "The population is not defined.",
        "The outcome is unclear."
      ],
      "betterVersion": "The effect of social media use on academic concentration among university students in Ethiopia.",
      "researchQuestions": [
        "How does daily social media use relate to academic concentration?",
        "Which social media behaviors are most associated with reduced concentration?"
      ]
    },
    "sources": []
  }
}
```

TypeScript:

```ts
type RoastResult = {
  problems: string[];
  betterVersion: string;
  researchQuestions: string[];
};
```

The roast should remain playful but the research feedback must be useful.

---

# 13. Funding Workflow

Funding mode is different from Vent and Roast.

Input:

```json
{
  "mode": "funding",
  "conversationId": null,
  "message": "My research studies AI-powered learning tools for university students in Ethiopia."
}
```

The backend should:

```text
Research context
      ↓
Gemini
      ↓
Extract research themes
      ↓
Find potential funding organizations/programs
      ↓
Collect public information
      ↓
Match research ↔ funder
      ↓
Return potential matches + sources
```

Important:

The system must NOT claim:

```text
"This organization will fund you."
```

It should say:

```text
"Potential funding match"
```

---

# 14. POST /api/funding

This endpoint may eventually be separated from `/api/chat`.

For MVP, either approach is acceptable:

### Option A

Use:

```text
POST /api/chat
```

with:

```json
{
  "mode": "funding"
}
```

### Option B

Dedicated endpoint:

```text
POST /api/funding
```

Recommended:

**Use ****`/api/chat`**** for the conversational funding experience and ****`/api/funding`**** for structured funding searches if needed.**

---

## Structured Funding Request

```json
{
  "research": {
    "title": "AI-powered learning tools for university students",
    "description": "Research exploring...",
    "field": "Education Technology",
    "location": "Ethiopia",
    "keywords": [
      "AI",
      "education",
      "university students"
    ]
  }
}
```

---

# 15. Funding Response

```json
{
  "data": {
    "matches": [
      {
        "organization": "Example Foundation",
        "program": "Education Innovation Grant",
        "description": "Supports research and innovation in education.",
        "whyMatch": "The program focuses on education innovation and your research focuses on AI-enabled learning.",
        "website": "https://example.org",
        "source": "https://example.org/program"
      }
    ]
  }
}
```

TypeScript:

```ts
type FundingMatch = {
  organization: string;
  program?: string;
  description: string;
  whyMatch: string;
  website?: string;
  source?: string;
};
```

---

# 16. POST /api/research

Creates a research project.

Authentication required.

Research is private by default.

---

## Request

```json
{
  "title": "AI and University Learning",
  "description": "This research explores...",
  "abstract": "This study investigates...",
  "field": "Education Technology",
  "keywords": [
    "AI",
    "education"
  ],
  "researchUrl": "https://example.com/research",
  "institution": "Example University",
  "location": "Ethiopia"
}
```

---

## Response

```json
{
  "data": {
    "id": "research-123",
    "title": "AI and University Learning",
    "description": "This research explores...",
    "abstract": "This study investigates...",
    "field": "Education Technology",
    "keywords": [
      "AI",
      "education"
    ],
    "researchUrl": "https://example.com/research",
    "institution": "Example University",
    "location": "Ethiopia",
    "visibility": "private",
    "supportEnabled": false,
    "createdAt": "2026-09-21T10:00:00Z",
    "updatedAt": "2026-09-21T10:00:00Z"
  }
}
```

---

# 17. GET /api/research

Used for the Discover page.

Important:

This endpoint must return **only intentionally published research**.

It must NOT automatically expose:

* ScholarXiv papers
* Private research
* Draft research
* Research that has not completed the support/publishing flow

---

## Response

```json
{
  "data": {
    "research": [
      {
        "id": "research-123",
        "title": "AI and University Learning",
        "researcher": {
          "id": "user-123",
          "name": "Researcher Name"
        },
        "field": "Education Technology",
        "description": "This research explores...",
        "researchUrl": "https://example.com/research",
        "institution": "Example University",
        "location": "Ethiopia",
        "supportEnabled": true
      }
    ]
  }
}
```

---

# 18. GET /api/research/

Returns a public research project.

If the research is private, only the owner can retrieve it.

If the requester is not the owner:

```text
Private research → 404
```

Do not expose private research by returning:

```json
{
  "visibility": "private"
}
```

to an unauthorized user.

---

# 19. POST /api/research//publish

Publishes research to Discover and enables support.

This endpoint is intentionally controlled by the backend.

---

## Request

```json
{
  "confirm": true
}
```

---

## Backend checks

Before publishing:

```text
1. User is authenticated
2. User owns the research
3. Research contains required public information
4. User explicitly confirmed publishing
5. Payment/support configuration exists
6. Payment configuration is valid
```

Only after all checks pass:

```text
visibility = "public"
supportEnabled = true
```

---

## Response

```json
{
  "data": {
    "id": "research-123",
    "visibility": "public",
    "supportEnabled": true,
    "status": "published"
  }
}
```

---

# 20. Publishing Rule

MVP rule:

```text
Research created
      ↓
PRIVATE
      ↓
Get Funding
      ↓
"Would you like to make your research public on Discover and enable Buy Me a Coffee?"
      ↓
     ┌───────────────┐
     │               │
    NO              YES
     │               │
     ▼               ▼
Remain private   Payment setup
                     │
                     ▼
                  Publish
                     │
                     ▼
              Discover + Support
```

The frontend must not independently change this state.

---

# 21. POST /api/research//unpublish

Makes research private again.

---

## Request

No body required.

---

## Response

```json
{
  "data": {
    "id": "research-123",
    "visibility": "private",
    "supportEnabled": false,
    "status": "unpublished"
  }
}
```

After unpublishing:

```text
Research disappears from Discover.
Support becomes inactive.
Research remains available to its owner.
```

---

# 22. POST /api/support/setup

Creates/configures support settings for a researcher.

**Exact implementation depends on Links.et API.**

Do not finalize external request fields until Links.et documentation has been checked.

Conceptual request:

```json
{
  "researchId": "research-123",
  "paymentMethod": "links_et"
}
```

Conceptual response:

```json
{
  "data": {
    "researchId": "research-123",
    "configured": true,
    "status": "ready"
  }
}
```

---

# 23. POST /api/support

Creates a support payment.

The support system is intended for small voluntary contributions, similar to "Buy Me a Coffee."

It is NOT formal research funding.

---

## Request

```json
{
  "researchId": "research-123",
  "amount": 100
}
```

---

## Backend checks

```text
1. Research exists
2. Research is public
3. Support is enabled
4. Researcher has completed payment setup
5. Amount is valid
6. Create payment through Links.et
```

---

## Conceptual Response

```json
{
  "data": {
    "paymentId": "payment-123",
    "status": "pending",
    "checkoutUrl": "https://example.com/checkout"
  }
}
```

**Exact Links.et fields must be verified before implementation.**

---

# 24. Payment Verification

Conceptual endpoint:

```text
POST /api/support/webhook
```

The exact webhook mechanism depends on Links.et.

The backend should verify the payment before recording it as successful.

Possible statuses:

```ts
type PaymentStatus =
  | "pending"
  | "successful"
  | "failed"
  | "cancelled";
```

---

# 25. GET /api/dashboard/research

Returns the authenticated user's research.

Authentication required.

---

## Response

```json
{
  "data": {
    "research": [
      {
        "id": "research-123",
        "title": "AI and University Learning",
        "visibility": "private",
        "supportEnabled": false,
        "createdAt": "2026-09-21T10:00:00Z"
      }
    ]
  }
}
```

---

# 26. PATCH /api/research/

Updates research owned by the authenticated user.

---

## Request

Any editable fields:

```json
{
  "title": "Updated Research Title",
  "description": "Updated description",
  "abstract": "Updated abstract",
  "field": "Education Technology",
  "keywords": [
    "AI",
    "education",
    "students"
  ]
}
```

Backend must verify ownership.

---

# 27. DELETE /api/research/

Optional MVP endpoint.

If implemented, backend must verify ownership.

Do not allow a user to delete another user's research.

---

# 28. Voice API

Voice uses Voxide.

**Exact request/response format must be verified against the current Voxide documentation before implementation.**

Do NOT assume the exact audio encoding, endpoint, or response format yet.

Conceptual endpoint:

```text
POST /api/voice
```

---

## Conceptual Request

```json
{
  "conversationId": "conversation-123",
  "mode": "vent",
  "audio": "..."
}
```

Possible flow:

```text
User microphone
      ↓
Frontend
      ↓
/api/voice
      ↓
Voxide
      ↓
Speech → text
      ↓
/api/chat
      ↓
Gemini + ScholarXiv
      ↓
Response text
      ↓
Voxide
      ↓
Audio response
      ↓
Frontend
```

The frontend should also support text input as a fallback.

---

# 29. Gemini Integration

Gemini is the primary LLM layer.

The Gemini API key must remain server-side.

Environment variable:

```env
GEMINI_API_KEY=
```

The frontend must NEVER contain:

```env
NEXT_PUBLIC_GEMINI_API_KEY=
```

or expose the Gemini API key to the browser.

---

## Gemini responsibilities

Gemini handles:

* Conversation
* Follow-up questions
* Research idea interpretation
* Roast generation
* Research question generation
* Research direction generation
* Funding-context extraction
* Final response generation
* Structured response formatting

ScholarXiv handles research/source retrieval.

---

# 30. Gemini + ScholarXiv

Recommended architecture:

```text
User message
     ↓
Backend
     ↓
Gemini
     ↓
Determine whether research evidence is needed
     ↓
ScholarXiv search
     ↓
Research results
     ↓
Gemini receives ScholarXiv context
     ↓
Final grounded response
```

The backend should avoid letting the model invent ScholarXiv citations.

Sources shown to the user should come from actual ScholarXiv results returned by the integration.

---

# 31. Structured AI Output

Where useful, Gemini should return structured JSON instead of relying entirely on free-form text.

Example:

```json
{
  "message": "Let's narrow this down.",
  "followUpQuestions": [
    "Who is your target population?",
    "Which location are you interested in?"
  ],
  "researchDirections": [],
  "sources": []
}
```

The backend should validate AI output before sending it to the frontend.

Gemini supports structured output using JSON schemas, which can be used for predictable response shapes.

---

# 32. AI Error Handling

If Gemini fails:

```json
{
  "error": {
    "code": "AI_SERVICE_UNAVAILABLE",
    "message": "The AI service is temporarily unavailable. Please try again."
  }
}
```

Do not expose:

* API keys
* internal stack traces
* provider credentials
* internal prompts
* sensitive infrastructure information

---

# 33. ScholarXiv Integration

The exact ScholarXiv API/MCP contract must be verified.

Backend responsibilities:

```text
- Search research
- Retrieve relevant research
- Normalize results
- Provide source metadata
- Handle no-result cases
- Handle service failures
- Avoid fabricated sources
```

The frontend should receive a normalized `ResearchSource` object and should not need to know ScholarXiv's internal response format.

---

# 34. ScholarXiv Source Normalization

Regardless of the external API response, convert it internally to:

```ts
type ResearchSource = {
  id: string;
  title: string;
  authors: string[];
  summary?: string;
  url: string;
  source: "ScholarXiv";
};
```

This keeps the frontend independent from ScholarXiv's API structure.

---

# 35. Database Entities

Minimum entities:

```text
users
conversations
messages
research_projects
support_settings
support_transactions
funding_matches
```

---

# 36. Conversations

Conceptual schema:

```text
conversations
--------------------
id
user_id
mode
created_at
updated_at
```

---

# 37. Messages

```text
messages
--------------------
id
conversation_id
role
content
created_at
```

Potential future fields:

```text
sources
metadata
```

Do not store large external API payloads unnecessarily.

---

# 38. Research Projects

```text
research_projects
--------------------
id
user_id
title
description
abstract
field
keywords
research_url
institution
location
visibility
support_enabled
created_at
updated_at
```

---

# 39. Support Settings

```text
support_settings
--------------------
id
user_id
research_id
payment_method
payment_configuration_reference
enabled
created_at
updated_at
```

Do not store raw payment credentials if the payment provider supports secure references/tokens.

---

# 40. Support Transactions

```text
support_transactions
--------------------
id
research_id
researcher_id
supporter_id
amount
payment_method
transaction_reference
verification_status
created_at
```

The exact payment fields depend on Links.et.

---

# 41. Funding Matches

```text
funding_matches
--------------------
id
user_id
research_context
organization_name
description
website
linkedin
funding_program
reason_for_match
source
created_at
```

---

# 42. Security Rules

Backend must enforce:

### Authentication

Private user resources require authentication.

### Ownership

A user can only modify their own:

* Research
* Conversations
* Dashboard data
* Support configuration

### Public research

Only intentionally published research can appear in Discover.

### Payment

Never trust the frontend for:

```text
payment success
support enabled
public visibility
transaction verification
```

These must be verified server-side.

---

# 43. API Contract Principles

## Frontend should know:

```text
What endpoint to call
What request to send
What response to expect
What errors can occur
```

## Frontend should NOT know:

```text
Gemini implementation
ScholarXiv internal API format
Links.et internal API
Voxide internal API
Database queries
API keys
Private backend logic
```

---

# 44. External Integration Checklist

Before finalizing implementation, backend developer must verify:

## Gemini

* [ ] API key setup
* [ ] Current SDK
* [ ] Model selection
* [ ] Structured output support
* [ ] Streaming requirements
* [ ] Rate limits
* [ ] Error handling

Google currently documents the `@google/genai` JavaScript SDK and both standard generation and structured outputs.

## ScholarXiv

* [ ] Current API/MCP interface
* [ ] Search method
* [ ] Search parameters
* [ ] Result structure
* [ ] Paper URL
* [ ] Author structure
* [ ] Rate limits
* [ ] Error behavior

## Voxide

* [ ] Authentication
* [ ] Speech-to-text
* [ ] Text-to-speech
* [ ] Supported audio formats
* [ ] Streaming
* [ ] Language support
* [ ] Error handling

## Links.et

* [ ] Payment creation
* [ ] Checkout URL
* [ ] Callback/webhook
* [ ] Payment verification
* [ ] Transaction ID
* [ ] Supported currencies
* [ ] Supported payment methods
* [ ] Refund/cancellation behavior

## Supabase

* [ ] Auth
* [ ] Database
* [ ] Row Level Security
* [ ] Server-side access
* [ ] Ownership policies

---

# 45. Environment Variables

`.env.example`

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Gemini
GEMINI_API_KEY=

# ScholarXiv
SCHOLARXIV_API_KEY=

# Voxide
VOXIDE_API_KEY=

# Links.et
LINKS_ET_API_KEY=

# Application
NEXT_PUBLIC_APP_URL=
```

Only variables explicitly required by each provider should be added.

Do not commit `.env`.

---

# 46. Frontend ↔ Backend Ownership

## Frontend developer

Responsible for:

```text
UI
UX
Forms
Loading states
Error states
API calls
Response rendering
Responsive design
```

## Backend developer

Responsible for:

```text
API routes
Validation
Authentication
Database
Gemini
ScholarXiv
Voxide
Links.et
Business rules
Security
```

## Shared

```text
API contracts
Integration testing
Bug fixing
Product decisions
Demo flow
Deployment
```

---

# 47. Day 1 Definition of Done

By the end of Day 1:

### Frontend

* [x] Next.js project created
* [ ] TypeScript configured
* [ ] Tailwind configured
* [ ] shadcn/ui configured if needed
* [ ] Main routes created
* [ ] Navigation created
* [ ] Chat shell created
* [ ] Discover shell created
* [ ] Basic design system established
* [ ] API client structure created

### Backend

* [ ] Supabase project created
* [ ] Authentication started
* [ ] Database schema drafted
* [ ] API route structure created
* [ ] Gemini API tested
* [ ] ScholarXiv integration investigated
* [ ] Voxide integration investigated
* [ ] Links.et integration investigated
* [ ] Environment variables documented

### Together

* [ ] GitHub repository created
* [ ] Both developers added
* [ ] Branch strategy agreed
* [ ] API contract reviewed
* [ ] External integration blockers identified
* [ ] Mock API responses prepared
* [ ] Day 2 tasks confirmed

---

# 48. Contract Change Rule

This document is a shared agreement, not a restriction.

If backend implementation requires changing an endpoint or response:

```text
1. Update this document.
2. Tell frontend developer.
3. Update TypeScript types.
4. Update mock data.
5. Update implementation.
6. Test the affected flow.
```

Do not silently change response structures after the frontend has implemented them.

---

# 49. Initial API Summary

| Method | Endpoint                      | Purpose                   | Auth                               |
| ------ | ----------------------------- | ------------------------- | ---------------------------------- |
| POST   | `/api/chat`                   | Vent/Roast/Funding chat   | Optional/required depending on MVP |
| POST   | `/api/funding`                | Structured funding search | Yes                                |
| POST   | `/api/research`               | Create research           | Yes                                |
| GET    | `/api/research`               | Discover public research  | No                                 |
| GET    | `/api/research/:id`           | Get research              | Public/owner                       |
| PATCH  | `/api/research/:id`           | Edit research             | Yes + owner                        |
| POST   | `/api/research/:id/publish`   | Publish + enable support  | Yes + owner                        |
| POST   | `/api/research/:id/unpublish` | Unpublish                 | Yes + owner                        |
| POST   | `/api/support/setup`          | Configure support         | Yes                                |
| POST   | `/api/support`                | Start support payment     | Depends                            |
| POST   | `/api/support/webhook`        | Verify payment            | Provider                           |
| GET    | `/api/dashboard/research`     | User's research           | Yes                                |
| POST   | `/api/voice`                  | Voice interaction         | Yes/depends                        |

---

# 50. Final Product Flow

```text
                    ┌──────────────┐
                    │    User      │
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  AI Chat     │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
           VENT          ROAST       FUNDING
              │            │            │
              └────────────┼────────────┘
                           ▼
                      ScholarXiv
                           │
                           ▼
                    Research insight
                           │
                           ▼
                    Funding matches
                           │
                           ▼
              ┌─────────────────────────┐
              │ Publish + Support?      │
              └────────────┬────────────┘
                           │
                    ┌──────┴──────┐
                    │             │
                   NO            YES
                    │             │
                    ▼             ▼
                 Private     Payment setup
                                  │
                                  ▼
                              Publish
                                  │
                                  ▼
                              Discover
                                  │
                                  ▼
                               Support
                                  │
                                  ▼
                               Voice
```

---

# 51. Important Day 1 Note

This document intentionally contains some **conceptual contracts** for external services.

The backend developer should update those sections after checking the actual provider documentation.

Especially verify:

```text
ScholarXiv
Voxide
Links.et
```

before implementing their exact request/response formats.

The internal frontend/backend contracts should remain stable wherever possible.
