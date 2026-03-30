# ApexAI Architecture

## System Overview
```
Caller → SignalWire → ApexAI Server → WebSocket → AI Pipeline
                                   ↓
                              Database (MySQL)
                              Redis (BullMQ)
                              Resend (Email)
```

## AI Voice Pipeline
```
1. Caller dials number
2. SignalWire hits POST /api/voice/start
3. Server returns <Connect><Stream> XML
4. SignalWire opens WebSocket to /api/voice-stream
5. Bidirectional audio flows
6. Inbound: mulaw 8kHz → PCM16 WAV → Whisper API → text
7. Processing: text → Claude API → response text
8. Outbound: text → Cartesia API → mulaw 8kHz → caller
```

## Multi-Tenant Architecture
```
User A ─── createdBy=A ─── Leads A, Campaigns A, Messages A
User B ─── createdBy=B ─── Leads B, Campaigns B, Messages B
(no cross-contamination)
```

## Phone Number Ownership
```
user_phone_numbers table:
  userId=1 → +18336596005
  userId=2 → +1XXXXXXXXXX (provisioned on signup)

Inbound call to +1XXXXXXXXXX:
  → getUserIdByPhoneNumber(+1XXXXXXXXXX) → userId=2
  → lead.createdBy = 2
  → appears only in User 2's dashboard
```

## Industry Pack System
```
user_industry_packs:
  userId=1, industry=solar, isPrimary=true
  userId=1, industry=hvac, isPrimary=false (addon)

Active industry drives:
  - AI conversation context
  - System prompt
  - FAQ answers
  - Booking triggers
```

## Worker Queue Architecture
```
BullMQ + Redis:
  calls queue → Call Worker → SignalWire API
  sms queue   → SMS Worker  → SignalWire API
  email queue → Email Worker → Resend API
```
