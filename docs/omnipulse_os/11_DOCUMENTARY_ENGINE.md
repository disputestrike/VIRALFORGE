# Documentary Engine

## Purpose

The Documentary Engine is the long-form production mode for OmniPulse OS. It turns one topic prompt into a structured 30-60 minute documentary or deep-dive package.

This is separate from the short-form factory. Shorts/Reels are optimized for speed, hooks, repetition, and fast experiments. Documentary production is optimized for research depth, chapter coherence, source evidence, narration quality, rights control, and long-form retention.

## Product Promise

User prompt:

> "Create a 1-hour documentary about the rise and fall of ancient Rome."

System output:

- documentary blueprint,
- chapter outline,
- research dossier,
- source list,
- claim ledger,
- 10,000+ word script where appropriate,
- voiceover,
- visual plan,
- licensed/generative asset plan,
- chapter renders,
- final master file,
- YouTube long-form package,
- Shorts/Reels/TikTok cutdowns,
- thumbnail set,
- description,
- chapters/timestamps,
- compliance report,
- cost report.

## Core Strategy

A true 1-hour documentary should not be generated as one monolithic job. It should be orchestrated as a multi-chapter production.

Reason:

- easier research,
- easier fact-checking,
- easier rendering,
- easier retry after failure,
- better cost control,
- better style consistency,
- better long-form pacing,
- better QA.

Default structure:

- 6 chapters x 10 minutes,
- or 8 chapters x 7-8 minutes,
- or 10 chapters x 5-6 minutes.

## Current Tool Reality

The user-provided context identified InVideo AI v4 Agent as a near all-in-one tool and Kling as a strong cinematic clip generator.

Implementation interpretation:

- InVideo should be treated as a possible production backend or competitor benchmark, not a guaranteed public API dependency.
- Kling should be treated as a short cinematic clip provider, not a full documentary orchestration layer.
- Runway, Luma, Sora, Veo, Pika, Kling, or similar tools can serve as hero-shot providers when API access, terms, cost, and quality justify them.
- FFmpeg/Remotion should remain the assembly and deterministic production backbone.
- Licensed stock footage remains important for documentary reliability and cost control.

The architecture should not depend on any single external provider having a stable public API.

## Documentary Workflow

### Stage 1: Prompt Intake

Inputs:

- topic,
- target length,
- target audience,
- tone,
- language,
- region,
- platform target,
- visual style,
- voice style,
- allowed providers,
- risk tolerance,
- review requirement,
- budget ceiling.

Example:

```json
{
  "topic": "The History of Ancient Rome",
  "target_minutes": 60,
  "audience": "curious general audience",
  "tone": "cinematic, clear, dramatic but sourced",
  "language": "en-US",
  "platform_targets": ["youtube_longform", "shorts_cutdowns"],
  "visual_style": "premium historical documentary",
  "risk_tolerance": "medium",
  "budget_ceiling": 75
}
```

### Stage 2: Documentary Blueprint

The planner creates:

- thesis,
- audience promise,
- narrative arc,
- chapter list,
- estimated runtime per chapter,
- key claims,
- source needs,
- visual motifs,
- pacing plan,
- retention beats,
- cliffhangers,
- title options,
- thumbnail concepts,
- cutdown opportunities.

Blueprint output:

```json
{
  "documentary_id": "doc_123",
  "target_minutes": 60,
  "chapters": [
    {
      "chapter_number": 1,
      "title": "A City Built From Myth",
      "target_minutes": 8,
      "purpose": "establish origin and stakes",
      "key_questions": ["What was Rome before empire?"],
      "visual_needs": ["map", "ancient city reconstruction", "timeline cards"]
    }
  ]
}
```

### Stage 3: Research Dossier

Each chapter gets a research task.

Research outputs:

- source list,
- source summaries,
- quoted facts or data points,
- claim candidates,
- contradictions between sources,
- timeline,
- names/dates/entities,
- uncertainty notes,
- visual references,
- citation quality score.

Source tiers:

- official/primary source,
- academic or institutional source,
- reputable journalistic source,
- encyclopedia/general reference,
- low-confidence web source,
- user-provided source.

Rules:

- high-confidence sources are preferred,
- low-confidence claims must be excluded or marked for review,
- source URLs and access dates are stored,
- sources must not be fabricated,
- direct quotes should be minimal and properly attributed if used.

### Stage 4: Script Generation

The scriptwriter builds:

- cold open,
- chapter scripts,
- transitions,
- narration,
- visual directions,
- lower-thirds,
- chapter cards,
- timestamps,
- closing CTA,
- cutdown markers.

Script quality requirements:

- one coherent voice,
- no repetitive AI filler,
- strong chapter openings,
- clear transitions,
- sourced claims,
- no unsupported certainty,
- no generic documentary padding,
- rhythm variation,
- retention beats every 30-90 seconds.

### Stage 5: Claim Extraction and Fact Review

Long-form content has higher fact risk than many short-form formats.

Every chapter script should run:

- claim extraction,
- claim sensitivity classification,
- evidence matching,
- contradiction check,
- stale-date check,
- confidence score,
- review routing.

Human review required for:

- historical controversy,
- modern political parallels,
- medical/legal/financial claims,
- claims about living people,
- accusations,
- sensitive identity or protected-class topics,
- disputed statistics,
- uncertain sourcing.

### Stage 6: Style Bible

The style bible keeps the entire documentary coherent.

Fields:

- narration voice,
- pronunciation guide,
- music style,
- color grade,
- typography,
- map style,
- lower-third style,
- chapter title style,
- motion language,
- sound design,
- citation display style,
- thumbnail style,
- forbidden visual cliches.

### Stage 7: Visual Plan

Each chapter receives a shot plan:

- stock footage candidates,
- generated hero shots,
- maps,
- timelines,
- infographics,
- archival images,
- animated cards,
- b-roll,
- transitions,
- on-screen text.

Visual path choices:

- template for maps, timelines, charts, title cards,
- stock hybrid for reliable documentary b-roll,
- generative hybrid for impossible, historical, or stylized shots,
- full generative video only for selected hero moments.

### Stage 8: Audio Plan

Audio outputs:

- voiceover,
- pronunciation guide,
- music cues,
- SFX cues,
- silence/beat markers,
- loudness targets,
- chapter intro/outro treatment.

Rules:

- synthetic voice terms must allow commercial use,
- voice clone requires consent and documentation,
- music must be licensed or generated with clear commercial rights,
- platform copyright claim risk must be minimized,
- final audio loudness must be normalized.

### Stage 9: Chapter Production

Each chapter is a separate render unit.

Per chapter:

- script,
- audio,
- captions,
- shot list,
- assets,
- rights ledger,
- render manifest,
- policy run,
- QA run,
- cost report.

Chapter statuses:

- planned,
- researching,
- scripted,
- fact_review,
- assets_ready,
- rendering,
- qa_review,
- approved,
- failed,
- needs_revision.

### Stage 10: Final Assembly

The assembler uses FFmpeg/Remotion to combine chapters.

Assembly tasks:

- chapter ordering,
- intro,
- chapter cards,
- transitions,
- global music bed,
- volume normalization,
- color consistency,
- end screen,
- credits/attributions,
- final caption track,
- chapter timestamp export,
- final thumbnail export,
- final master manifest.

Outputs:

- 16:9 YouTube master,
- optional 9:16 trailer,
- optional 1:1 social cut,
- audio-only export,
- caption sidecar,
- thumbnail pack,
- chapter metadata.

### Stage 11: Long-Form QA

Long-form QA must catch issues short-form QA does not.

Checks:

- full playback integrity,
- no missing chapter,
- no repeated chapter,
- no dead air,
- no audio jumps,
- no caption drift,
- no mismatched visuals,
- no unsupported claims,
- sources attached,
- music rights verified,
- synthetic labels decided,
- title/thumbnail not misleading,
- chapter timestamps correct,
- long-form retention pacing acceptable.

### Stage 12: Distribution Package

YouTube long-form package:

- title,
- description,
- chapter timestamps,
- sources/reading list if appropriate,
- thumbnail,
- tags,
- category,
- captions,
- AI disclosure decision,
- sponsor/affiliate disclosure,
- end screen notes,
- pinned comment draft.

Cutdown package:

- 5-20 Shorts/Reels/TikTok candidates,
- each cutdown with hook,
- title,
- caption,
- source linkage,
- link back to full video,
- platform package.

## Documentary Data Model

`documentary_projects`

- id
- tenant_id
- channel_id
- title
- topic
- thesis
- target_minutes
- language
- region
- style_bible_json
- budget_ceiling
- risk_score
- status
- created_at
- updated_at

`documentary_chapters`

- id
- documentary_project_id
- chapter_number
- title
- target_minutes
- purpose
- outline_json
- script_id
- render_id
- qa_status
- status

`research_dossiers`

- id
- documentary_project_id
- chapter_id
- research_question
- summary
- source_count
- confidence_score
- contradictions_json
- status

`documentary_sources`

- id
- dossier_id
- source_id
- relevance_score
- support_level
- notes

`documentary_assembly_jobs`

- id
- documentary_project_id
- chapter_render_ids
- output_manifest_json
- storage_url
- status
- cost_estimate
- actual_cost
- created_at
- completed_at

`cutdown_candidates`

- id
- documentary_project_id
- source_chapter_id
- start_time
- end_time
- hook
- platform_targets
- script_text
- render_id
- status

## Internal API Contracts

### Create Documentary Project

```http
POST /api/v1/documentaries
```

```json
{
  "topic": "The History of Ancient Rome",
  "target_minutes": 60,
  "channel_id": "chn_123",
  "language": "en-US",
  "region": "US",
  "style": "cinematic educational",
  "budget_ceiling": 75
}
```

### Generate Blueprint

```http
POST /api/v1/documentaries/{id}/blueprint
```

### Generate Chapter Research

```http
POST /api/v1/documentaries/{id}/chapters/{chapter_id}/research
```

### Generate Chapter Script

```http
POST /api/v1/documentaries/{id}/chapters/{chapter_id}/script
```

### Render Chapter

```http
POST /api/v1/documentaries/{id}/chapters/{chapter_id}/render
```

### Assemble Documentary

```http
POST /api/v1/documentaries/{id}/assemble
```

### Generate Cutdowns

```http
POST /api/v1/documentaries/{id}/cutdowns
```

## Documentary Engine UI

Screens:

- Documentary Studio
- Blueprint Builder
- Research Dossier
- Chapter Board
- Script Editor
- Visual Plan
- Source and Claims
- Chapter Render Queue
- Assembly Console
- Long-Form QA
- Cutdown Generator
- YouTube Package

Important UX:

- show chapter progress,
- show total estimated cost,
- show source coverage,
- show unresolved claims,
- show render status,
- allow chapter rerender without restarting whole project,
- allow manual edits to outline/script,
- expose final evidence/compliance report.

## Cost Controls

Documentaries can become expensive. The engine must estimate cost before production.

Cost buckets:

- research/model calls,
- script/model calls,
- image/video generation,
- stock licensing,
- voiceover minutes,
- music,
- render compute,
- storage,
- human review.

Controls:

- chapter budget,
- project budget,
- provider caps,
- approval before full generative shots,
- fallback to template/stock-hybrid,
- stop if source coverage is too weak,
- stop if policy risk becomes too high.

## Documentary QA Metrics

Track:

- research coverage,
- claim verification rate,
- source confidence,
- script originality,
- chapter completion,
- render success,
- caption sync,
- average chapter pacing score,
- cost per finished minute,
- cost per published documentary,
- long-form retention,
- short-form cutdown conversion,
- revenue per documentary.

## Programming Strategy

Documentaries should become weekly or biweekly "deep dives" that complement daily short-form output.

Cadence:

- Seed: one 10-20 minute documentary test per month.
- Learning: one 20-40 minute documentary every two weeks.
- Scale: one 45-60 minute documentary per week per proven long-form channel.

Documentary channels should not launch before the short-form pipeline proves:

- sourcing,
- PolicyOS,
- render QA,
- YouTube packaging,
- analytics import,
- cost tracking.

## Long-Form To Short-Form Flywheel

Every documentary becomes:

- full YouTube video,
- 5-20 short-form clips,
- quote cards,
- poll prompts,
- ranking/comparison posts,
- newsletter/article,
- source/resource page,
- future update episode.

This makes one high-effort research project feed multiple channels without duplicating low-effort spam.

## Compliance Rules

Documentaries require stricter compliance:

- source every factual section,
- do not invent citations,
- do not present AI reconstructions as archival footage,
- disclose synthetic reenactments when needed,
- avoid misleading thumbnails,
- respect music/stock rights,
- avoid unsupported accusations,
- avoid public-person defamation,
- keep a correction workflow.

## Documentary Engine Definition Of Done

The engine is MVP-complete when:

- a user can create a documentary from one prompt,
- the system generates a chapter blueprint,
- at least three chapters can be researched independently,
- claims are extracted and matched to sources,
- chapter scripts can be generated,
- voiceover can be generated or attached,
- chapter renders can be produced,
- FFmpeg assembly produces a final master,
- YouTube package exports,
- cutdown candidates are generated,
- cost and compliance reports are attached.

## Strategic Decision

The Documentary Engine is a major expansion, but it should not derail the core OS. Build it as a premium production mode after the short-form pipeline and PolicyOS are functional.

Short-form gives speed and data. Long-form gives authority, watch time, monetization depth, and reusable source libraries. The strongest system uses both.
