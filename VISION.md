# Vision

## One sentence

A code-first headless CMS designed to be driven primarily by LLMs and agentic content pipelines, with a clean admin UI for the humans who supervise them.

## Who this is for

**Primary: LLMs and agentic content pipelines.** Systems like MassContent and inferno-content generate, enrich, and publish content through the InfernoCMS API at machine pace. The API is the product surface they live in. Predictable shapes, explicit constraints, actionable error messages, and stable contracts are what "good UX" means here — not human ergonomics.

**Secondary: Humans operating those pipelines.** Solo developers and small teams who configure schemas, supervise content output, and review what their pipelines produce. They live in `content.config.ts`, the admin UI, and the docs.

**Tertiary: Humans hand-authoring content directly.** It works fine — the admin UI is a real CMS — but it's not the design center. If a feature has to choose between "easier for an LLM to produce correct output" and "fewer clicks for a human content editor," the LLM wins.

**Not for:** Enterprise teams needing workflow approvals, audit logs, compliance, or visual page builders. We're not trying to serve everyone.

## The problem we solve

Most CMSes were designed for human content editors clicking through admin panels. When an LLM tries to produce content for them, every layer fights back: opaque content shapes that aren't documented anywhere, validation errors that are written for humans to read, schemas that live in a database (not source control), brittle auth ceremonies, and APIs that assume a human is going to retry on failure.

InfernoCMS inverts that. Schemas live in code. The API is REST with a stable envelope. Errors are structured. Auth is a single bearer-token mechanism. Schema introspection is a single endpoint. An LLM with a token can write to any endpoint without reading any docs — and produce correct output, repeatably, because the constraints are machine-checkable.

## Core principles

### 1. The API is the product

REST endpoints, predictable shapes, no query languages, no SDKs required. Every collection gets the same five verbs. Every response has the same envelope. Every error has the same structure. An LLM doesn't need to learn InfernoCMS — it needs to use it, and a good API design means it can.

### 2. Code is the source of truth for schema

Schemas live in `content.config.ts`, version-controlled, reviewable, deployable. The admin UI reflects code, not the other way around. There is no "click here to add a field" — that's an anti-pattern for systems where the schema needs to be predictable to upstream code generators.

### 3. Schema introspection is first-class

`GET /api/_schema` returns the entire content model as machine-readable JSON: every collection, every field, every constraint. A pipeline pointed at an unknown InfernoCMS instance can discover its full surface in one request. Type generation is a downstream consumer of this same endpoint.

### 4. Sensible defaults, escape hatches when needed

Zero-config local dev (PGlite, local files, generated bootstrap admin token). Production swaps in PostgreSQL via `DATABASE_URL`, S3 via storage config, and a Cloud-provided bootstrap token. The opt-ins exist where they're needed; the defaults are correct.

### 5. One auth mechanism for everything

A bearer token. Same for the admin UI, same for an LLM pipeline, same for a curl smoke test. No cookies, no sessions, no OAuth dance, no separate "API key" concept living next to "user accounts." Three scopes (`read` / `write` / `admin`), revocable from the admin UI, generated on first run. See [auth design](docs/superpowers/specs/2026-05-08-cms-auth-design.md).

### 6. Errors are written for the consumer that hits them

Every error is a JSON object with `message` and `code`. Validation errors include the field that failed and why. An LLM reading a 400 response should be able to retry with corrected input on the next call without human intervention. A human reading the same response should also understand what went wrong, but the LLM is the test case.

## What we are NOT

| We are NOT | Because |
|---|---|
| A page builder | We manage content; layout belongs to the consuming app. |
| A visual editing tool | The admin UI is for supervision, not for hand-authoring at scale. |
| A "low-code" platform | We are a code-first content layer. The schema is code. |
| An identity provider | We auth into the CMS itself. Consuming apps handle their own end-user auth. |
| A framework | We plug into any stack via REST. |
| An enterprise platform | Simple > feature-complete. |

## Success metrics

1. **An LLM can produce correct content on first call** given only `/api/_schema` and a bearer token.
2. **Time to first content item** for a human: under 60 seconds from `npm install` to a created row.
3. **Lines of config for a blog**: under 20.
4. **API response time**: under 50 ms p95 on a single-CPU instance.
5. **Validation error → corrected retry** is mechanical, not heuristic.

## North star

When a content pipeline's author asks "what backend should I point this at?", we want the answer to be obvious: "Use InfernoCMS. Define your collections, hand the agent a write-scoped token, point it at `/api/_schema`. It'll figure out the rest."

The same answer works for a human asking "what should I use for my blog or marketing site?" — they get the admin UI as the supervision layer over the same primitives.
