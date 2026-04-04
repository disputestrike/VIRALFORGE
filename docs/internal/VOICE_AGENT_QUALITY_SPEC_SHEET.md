# Voice conversational agent — engineering quality spec sheet & QC checklist

**Repository path (source of truth):** `ApexAI/docs/internal/VOICE_AGENT_QUALITY_SPEC_SHEET.md`  
**Automated verification:** `pnpm run test:vaqs` (from repo root `ApexAI/`) — see §11.

**Document type:** Engineering specification + compliance QA/QC rubric  
**Version:** 1.1  
**Status:** Baseline for competitive benchmarking and release gates  
**Basis:** Industry practice for turn-taking, barge-in, endpointing, streaming latency, spoken-answer depth, dialog persistence (see research synthesis in project history).

**Companion docs:** [`VOICE_STAGING_CHECKLIST.md`](./VOICE_STAGING_CHECKLIST.md) · [`../integration/VOICE_COMPLIANCE_MATRIX.md`](../integration/VOICE_COMPLIANCE_MATRIX.md) · [`../integration/CROSSWALK.md`](../integration/CROSSWALK.md)

---

## 1. Purpose

This sheet defines **Critical-to-Quality (CTQ)** attributes for a **real-time voice AI agent** (telephony or similar). Use it to:

- Run **structured QA/QC** and **compliance-style audits** against a single standard.
- **Score** any implementation (internal build or competitor) on the same rubric.
- Gate releases: when the **weighted checklist** meets the **threshold** in §6, treat the product as meeting the **reference expectation** for this spec.

This document is **normative for scoring**; evidence tiers (code / automated / logs / recordings) align with `VOICE_COMPLIANCE_MATRIX.md`.

---

## 2. Scope & assumptions

| In scope | Out of scope |
|----------|----------------|
| Duplex voice: user speaks, agent speaks (TTS), interruptions | Text-only chat UX |
| PSTN/WebRTC audio path with background noise as a test dimension | Non-voice modalities |
| Latency from end-of-user-turn to first agent audio | Legal/regulatory advice (use separate compliance packs) |

**Agent under test (AUT):** Name the build (commit, model IDs, env profile) on every scored run.

---

## 3. Quality framework (Six Sigma–aligned, simplified)

| Concept | How this spec uses it |
|---------|------------------------|
| **Voice of customer (VOC)** | Caller expects: not cut off, not hyper-sensitive to noise, no long dead air, human-like pacing, complete-enough answers, on-task persistence, low perceived latency. |
| **CTQ** | Each checklist row in §5 maps to a measurable or auditable behavior. |
| **Defect** | Any criterion scored **Not met** (0 points) for a required row in a scored scenario set counts as one **defect opportunity** failed. **Partial** (0.5) = conditional acceptance; track as **yield loss**. |
| **Sigma (informal)** | Use **overall % score** (§6) as the release proxy; do not claim formal DPMO without a fixed sample size and control chart. |

---

## 4. Scoring model (rater)

### 4.1 Dimensions and weights (must sum to 100%)

| Code | Dimension | Weight % | What “100%” means |
|------|-----------|----------|-------------------|
| **TT** | Turn-taking & endpointing | 18 | User seldom cut off mid-thought; end-of-turn detection feels natural. |
| **BI** | Barge-in & noise robustness | 16 | Real interruptions stop TTS quickly; noise/TV does not constantly false-trigger. |
| **RT** | Responsiveness & silence | 18 | Minimal awkward silence; first agent audio within target after user stops. |
| **AQ** | Spoken answer quality | 18 | Answers are **complete enough for speech**, not telegraphic one-liners (unless user asked for one word). |
| **DP** | Dialog policy & persistence | 16 | Stays on case; handles small talk / topic shifts with return-to-task; remembers active question. |
| **LA** | Latency architecture & streaming | 14 | Streaming LLM→TTS; instrumentation supports p50/p95 checks. |

### 4.2 Per-criterion scale (apply within each dimension)

For each row in §5, assign:

| Score | Label | Definition |
|-------|--------|------------|
| **1.0** | **Met** | Observed across the **minimum scenario set** (§7) with no material failure. |
| **0.5** | **Partial** | Works in common case; fails in edge case (e.g. noisy room, long pause mid-sentence, or rare false barge-in). |
| **0** | **Not met** | Repeated failure or systematic miss. |
| **N/A** | **Excluded** | Not applicable to this AUT (document why); **reallocate weight** proportionally to other rows in that dimension or exclude dimension from denominator (record in QA log). |

### 4.3 Dimension score

For dimension \(d\) with \(n\) applicable rows, each with equal weight within the dimension:

\[
\text{Dimension score}_d = 100 \times \frac{\sum \text{row scores}}{n}
\]

### 4.4 Overall weighted score

\[
\text{Overall} = \sum_d \left( \frac{w_d}{100} \times \text{Dimension score}_d \right)
\]

Where \(w_d\) is the weight from the table in §4.1.

### 4.5 Interpretation (release / competitive band)

| Overall % | Band | Expectation |
|-----------|------|----------------|
| **100** | **Reference** | Matches full research-backed expectation; suitable as **gold standard** demo and benchmark anchor. |
| **95–99** | **Ship (high)** | Production-acceptable for most consumer/pro SMB voice products; log Partial items as backlog. |
| **90–94** | **Ship (conditional)** | Ship only with **written waivers** on failed rows + remediation plan. |
| **80–89** | **Not ready** | Major UX risk (cut-offs, silence, or answer quality). |
| **&lt; 80** | **Fail** | Do not compare favorably to reference; fundamental architecture or tuning gap. |

**Competitive use:** Score **Product A vs Product B** on the same §7 scenarios; difference **≥ 5 points** overall is typically **material** for positioning; confirm with qualitative notes.

---

## 5. Checklist — requirements & verification

**ID convention:** `VAQS-XX` (Voice Agent Quality Spec).  
**Verify by:** **I** = instrumented logs/metrics · **S** = scripted live call · **L** = listening rubric (human) · **A** = automated test (if exists).

### 5.1 TT — Turn-taking & endpointing

| ID | Requirement | Verify | Pass target |
|----|-------------|--------|-------------|
| VAQS-01 | Mid-sentence pauses (&lt; ~500–800 ms) do **not** reliably trigger false end-of-user-turn. | S, L, I | ≥ 90% of deliberate pause-in-phrase trials: agent does **not** start talking over user. |
| VAQS-02 | Clear end-of-utterance (full thought) is followed by agent response without excessive delay (see RT). | S, L | Listener rates “natural handoff” acceptable on ≥ 90% trials. |
| VAQS-03 | System uses **hangover / hysteresis** or equivalent so VAD flapping does not chop user audio into fake turns. | I, A if available | Logs show stable turn boundaries; no burst of alternating micro-turns in single breath. |
| VAQS-04 | If semantic or prosodic turn-end is available, it is tuned so **false cut-off rate** is measured and reviewed. | I | p95 false cut-offs per 10 min call **≤ agreed internal cap** (define in QA log). |

### 5.2 BI — Barge-in & noise robustness

| ID | Requirement | Verify | Pass target |
|----|-------------|--------|-------------|
| VAQS-05 | User speech **during TTS** stops or ducks playback within **human-competitive** latency (industry often targets hundreds of ms; record actual p50/p95). | S, I | p95 stop-audio latency documented; meets AUT SLA. |
| VAQS-06 | Background noise (office, street, TV at moderate level) does **not** cause constant false barge-in / TTS chop. | S, L | ≤ 1 false stop per **2 min** TTS exposure in standardized noise fixture (or waiver). |
| VAQS-07 | Acoustic echo from agent audio is mitigated (**AEC** or policy) so agent does not “interrupt itself.” | S, L | No systematic self-trigger in standard handset/softphone test. |
| VAQS-08 | Stale generation cancelled after barge-in (no “late” clause playing after user took floor). | I, S | Epoch / cancel traces match behavior 100% in test set. |

### 5.3 RT — Responsiveness & silence

| ID | Requirement | Verify | Pass target |
|----|-------------|--------|-------------|
| VAQS-09 | **Dead air** after user clearly finishes: bounded; listener does not describe “awkward long silence.” | S, L, I | **TTFB** (user end → first agent audio): p50 **≤ ~600 ms**, p95 **≤ ~800–1000 ms** (document network; adjust SLA in QA log if justified). |
| VAQS-10 | First **speakable** clause begins streaming without waiting for full LLM completion (where architecture allows). | I | `llm_stream_start` → `tts_first_chunk` (or equivalent) shows streaming behavior. |
| VAQS-11 | Optional backchannels (“Got it”) used **sparingly** and only if consistent with persona; no conflict with “no pointless filler” product rules. | L | If forbidden by product, **zero** violations; if allowed, **≤ 1** per turn and **&lt; 300 ms** audio. |

### 5.4 AQ — Spoken answer quality

| ID | Requirement | Verify | Pass target |
|----|-------------|--------|-------------|
| VAQS-12 | Factual questions receive **minimum complete spoken answers**: anchor entity + **1–2** high-signal facts (e.g. role + timeframe), not one-word replies **unless** user explicitly asked for minimal. | L, S | ≥ 90% of scripted factual prompts meet rubric (see §7.2). |
| VAQS-13 | Answers are **written for the ear**: no bullets/markdown; numbers and names in speakable form; sentence length appropriate for listening. | L | Listener checklist pass on ≥ 90% samples. |
| VAQS-14 | Avoids **over-long monologue** on simple prompts; complexity **split across turns** when needed. | L | Simple prompt: **≤ ~50 words** or **≤ ~25 sec** TTS unless user asked for detail (tune per product). |
| VAQS-15 | Does not contradict **known** session facts (appointment time, name) without correction flow. | S, I | Zero contradictions in scenario suite. |

### 5.5 DP — Dialog policy & persistence

| ID | Requirement | Verify | Pass target |
|----|-------------|--------|-------------|
| VAQS-16 | **Active task / question** persists across turns; agent can **recap** or **bridge back** after brief tangent. | S, L | ≥ 90% success on §7.3 persistence scenarios. |
| VAQS-17 | Small talk or off-topic input handled **without** losing the job-to-be-done (booking, support, etc.). | S, L | Listener rates “got back on track” acceptable. |
| VAQS-18 | Mode clarity: answer vs clarify vs handoff behaviors are distinguishable and appropriate (no random handoff). | S, L | Matches product policy 100% in scripted cases. |

### 5.6 LA — Latency architecture & streaming

| ID | Requirement | Verify | Pass target |
|----|-------------|--------|-------------|
| VAQS-19 | STT, LLM, and TTS connections are **warm** or pooled where possible; no systematic cold-start on every turn. | I, A | Trace shows reuse or accept documented cold-start budget. |
| VAQS-20 | Prompt / context injection sized for **latency budget**; session state summarized rather than full transcript replay every turn when harmful. | I, code review | Meets AUT budget; no regression vs baseline in p95 TTFB. |
| VAQS-21 | **Metrics exported**: at minimum endpoints for STT final, LLM first token/chunk, TTS first byte/audio (names may vary). | I | Dashboard or log slice available for QA run. |

---

## 6. Gate summary (quick)

| Gate | Rule |
|------|------|
| **G1 — Internal release candidate** | Overall **≥ 95%** and **no** VAQS row **Not met** in **TT** or **BI** (hard UX). |
| **G2 — Reference parity** | Overall **= 100%** and all applicable VAQS rows **Met** on **two** independent rater sessions. |
| **G3 — Competitive claim** | Same scenario suite and environment for both products; document AUT versions; attach scorecard. |

---

## 7. Minimum scenario set (mandatory for a scored run)

Run **at least** the following **live or lab-realistic** calls per AUT. Extend for regulated industries.

### 7.1 Core (per scenario: note pass/partial/fail per affected VAQS rows)

1. **Mid-sentence pause:** User says a sentence with a **700 ms** pause in the middle, then continues.  
2. **Barge-in:** User interrupts TTS mid-sentence with a clear new question.  
3. **Noise fixture:** TTS plays while **moderate** background noise (specified dB/fixture file) is present.  
4. **Factual depth:** Ask “Who is the president of the United States?” (or locale-appropriate equivalent) — expect **anchor + substantive fact**, not one word.  
5. **Simple then detail:** Ask a follow-up “when were they elected?” — expect coherent continuity.  
6. **Tangent return:** User goes off-topic for **one** turn, then silence — agent should **re-anchor** task (if task was established).  
7. **Persistence:** State a preference (e.g. “Tuesday afternoon”); **two** neutral turns later, confirm agent still holds context.

### 7.2 Listening rubric (factual answer)

**Met (1.0):** Names office + person (or correct “I don’t have live data” per policy) + **at least one** of: election year, term framing, or single clarifying offer (“Do you want policy or biography?”).  
**Partial (0.5):** Correct but **too short** (e.g. last name only) or **too long** (mini lecture).  
**Not met (0):** Wrong, evasive without policy reason, or one-word when rubric expects completeness.

### 7.3 Persistence rubric

**Met:** Agent recalls stated constraint or **explicitly** asks to reconfirm without contradicting prior commitment.  
**Not met:** Forgets constraint or invents conflicting detail.

---

## 8. Crosswalk — spec ↔ compliance matrix ↔ staging

| VAQS IDs | VOICE_COMPLIANCE_MATRIX (primary section) | VOICE_STAGING_CHECKLIST |
|----------|-------------------------------------------|-------------------------|
| VAQS-01–04 | §4 Turn-taking | §4 Live call — natural exchange |
| VAQS-05–08 | §4 Turn-taking, §3 Response timing | §4 Barge-in |
| VAQS-09–11 | §3 Response timing | §4 Live call smoke |
| VAQS-12–15 | §2 Core objective, §8b Guardrails | §5 Manual compliance |
| VAQS-16–18 | §6–8 Policy | §5 Manual compliance |
| VAQS-19–21 | §3 Response timing, stack rows §1 | §1 Automated + §4 traces |

---

## 9. QA/QC run record (copy per audit)

| Field | Value |
|-------|--------|
| Date | |
| AUT name / version / commit | |
| Rater(s) | |
| Environment (staging / prod / lab) | |
| Scenario set | §7 default ☐ extended ☐ |
| Instrumentation snapshot | (dashboard / log IDs) |
| Dimension scores (%) | TT: ___ BI: ___ RT: ___ AQ: ___ DP: ___ LA: ___ |
| **Overall %** | |
| **Gate** (G1 / G2 / G3) | Pass ☐ Fail ☐ |
| Waivers (row ID + rationale) | |
| Attachments | recordings path / ticket |

---

## 10. Document control

| Version | Date | Change |
|---------|------|--------|
| 1.0 | 2026-04-02 | Initial spec sheet, scoring model, crosswalk |
| 1.1 | 2026-04-02 | §11 ApexAI automation: `vaqsCrosswalk.ts`, `vaqsEngineering.test.ts`, `deepgram_turn_committed` trace |

**Owner:** Engineering + QA (joint). **Review cadence:** After major voice stack change or quarterly.

---

## 11. ApexAI — automated implementation proof (CI)

**Goal:** Every VAQS row has **either** (a) automated code/telemetry crosswalk in CI, **or** (b) an explicit **manual-only** note for PSTN/listening scenarios.

| Artifact | Role |
|----------|------|
| [`server/realtime/vaqsCrosswalk.ts`](../../server/realtime/vaqsCrosswalk.ts) | Maps **VAQS-01–21** → repo paths + `mustContain` evidence strings. |
| [`server/realtime/vaqsEngineering.test.ts`](../../server/realtime/vaqsEngineering.test.ts) | Vitest: all rows resolve to files; telemetry phases exist; debounce band 500–800ms; env clamps sane. |
| `pnpm run test:vaqs` | Runs only the VAQS engineering file (fast gate). |
| `pnpm run test:voice` | Full `server/realtime` suite (guardrails, policy, prompts, VAQS). |

**Corrective action (Six Sigma loop):** If `test:vaqs` fails, treat as **spec drift** — update implementation **or** update `vaqsCrosswalk.ts` with an approved engineering change and spec text. Do not delete failing assertions without product sign-off.

**Manual remainder (not CI-gatable):** §7 scenario set (mid-sentence pause, noise fixture, factual listening rubric). Use §9 QA record + `VOICE_STAGING_CHECKLIST.md` §4–5.
