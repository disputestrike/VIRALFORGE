# ApexAI Voice Live QA Scorecard

Use this scorecard for launch QA, production smoke tests, and post-deploy regression checks for the ApexAI public demo line and at least one real customer tenant.

Primary public demo line:
- `+1 (833) 659-6005`

Run this against:
- ApexAI public demo line
- one customer tenant with a dedicated number
- one tenant with booking/calendar connected
- one tenant with CRM connected

## Scoring

- `13-15 pass`: production-ready with minor tuning
- `10-12 pass`: strong, but needs focused fixes before full rollout
- `7-9 pass`: core works, but customer-facing risks remain
- `<7 pass`: not ready for live promotion

## ApexAI Demo Line

### 1. Greeting

Prompt:
- Call the public demo number and listen to the first greeting.

Pass if:
- it introduces ApexAI clearly
- it sounds like ApexAI's company line
- it feels specific rather than generic

Fail if:
- it sounds vague, generic, or like a customer tenant

Result:
- Pass / Fail

Notes:
- 

### 2. Product Explanation

Prompt:
- Ask: `What does ApexAI do?`

Pass if:
- it clearly explains inbound calls
- it clearly explains outbound calls
- it mentions booking, CRM, and SMS in a coherent way

Fail if:
- answers are fuzzy, incomplete, or inaccurate

Result:
- Pass / Fail

Notes:
- 

### 3. Demo Conversation Quality

Prompt:
- Ask for a roleplay or short product demo.

Pass if:
- it can demo naturally without sounding rigid
- it stays on-message and commercially sharp

Fail if:
- it becomes robotic, repetitive, or confused

Result:
- Pass / Fail

Notes:
- 

### 4. Interruption Handling

Prompt:
- Interrupt it 5-10 times with phrases like `wait`, `hold on`, `yeah`, `that's not what I meant`.

Pass if:
- it stops quickly
- it pivots to the newest user input
- it does not continue the old answer after the interruption

Fail if:
- it talks over the caller
- it resumes stale content
- it gets stuck or confused

Result:
- Pass / Fail

Notes:
- 

### 5. Turn-Taking Speed

Prompt:
- Ask several short follow-up questions and pay attention to pauses.

Pass if:
- response timing feels natural
- pauses do not feel slow or obviously bot-like

Fail if:
- turn gaps feel sluggish or awkward

Result:
- Pass / Fail

Notes:
- 

### 6. Escalation Behavior

Prompt:
- Ask for a human or ask a harder edge-case question.

Pass if:
- it handles escalation or fallback cleanly
- it does not trap the caller in loops

Fail if:
- it refuses to yield
- it loops or stalls

Result:
- Pass / Fail

Notes:
- 

## Booking

### 7. Appointment Capture

Prompt:
- Ask to schedule a demo or appointment.

Pass if:
- it correctly captures name
- it correctly captures phone
- it correctly captures email
- it correctly captures date and time

Fail if:
- it misses details
- it confirms the wrong information

Result:
- Pass / Fail

Notes:
- 

### 8. Calendar Outcome

Prompt:
- Run the booking flow on a tenant with calendar connected, then on one without it.

Pass if:
- a connected tenant creates a real calendar event
- an unconnected tenant uses the intended fallback flow

Fail if:
- no event is created for a connected tenant
- the fallback path is missing or broken

Result:
- Pass / Fail

Notes:
- 

## CRM

### 9. Lead Creation

Prompt:
- Run a lead qualification flow through the voice agent.

Pass if:
- the lead or contact appears in the connected CRM

Fail if:
- no record appears

Result:
- Pass / Fail

Notes:
- 

### 10. Data Accuracy

Prompt:
- Compare captured data in the CRM against what was said on the call.

Pass if:
- name is correct
- company is correct
- phone is correct
- email is correct
- intent and notes are usable
- no duplicate record is created unexpectedly

Fail if:
- fields are missing, malformed, or duplicated

Result:
- Pass / Fail

Notes:
- 

## Customer Tenant

### 11. Number Provisioning

Prompt:
- Create a fresh test account and complete onboarding.

Pass if:
- the customer receives a dedicated number
- the number is associated with the new tenant

Fail if:
- no number is assigned
- the wrong number is assigned

Result:
- Pass / Fail

Notes:
- 

### 12. Tenant Isolation

Prompt:
- Call the customer tenant's number and ask tenant-specific questions.

Pass if:
- it answers from that tenant's content only
- it does not reference ApexAI demo content or another tenant

Fail if:
- content bleeds across tenants

Result:
- Pass / Fail

Notes:
- 

### 13. Knowledge Ingestion

Prompt:
- Add or update website content for the customer tenant and reprocess.

Pass if:
- the agent reflects the updated content after ingestion
- responses feel specific to the tenant

Fail if:
- answers remain stale, generic, or wrong

Result:
- Pass / Fail

Notes:
- 

## SMS

### 14. Messaging Readiness

Prompt:
- Check the tenant UI and status indicators for local and toll-free numbers.

Pass if:
- the app truthfully shows whether SMS is ready
- the app truthfully shows when `10DLC` approval is pending
- the app truthfully shows when toll-free verification is pending

Fail if:
- it falsely claims outbound SMS is ready

Result:
- Pass / Fail

Notes:
- 

### 15. SMS Workflow

Prompt:
- Trigger a confirmation or follow-up workflow.

Pass if:
- supported inbound or outbound behavior matches the tenant's real approval state
- no silent delivery promises are made when approval is pending

Fail if:
- messages silently fail
- the user is promised outbound SMS that is not actually available

Result:
- Pass / Fail

Notes:
- 

## Final Tally

- Total Passed: `__/15`

## Summary Notes

- 
- 
- 

## Recommended Evidence To Capture

- call recordings or transcripts
- screenshots of booking confirmation
- screenshots of CRM records
- screenshots of onboarding number assignment
- screenshots of SMS readiness state
- Railway logs for any failed or degraded run
