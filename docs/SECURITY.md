# ApexAI Security Documentation

## Authentication & Authorization
- **Authentication**: Google OAuth 2.0 via JWT sessions
- **Session Management**: HTTP-only cookies, SameSite=Strict
- **Authorization**: Role-based (user/admin) enforced at tRPC procedure level
- **Protected Routes**: All data-access procedures use `protectedProcedure`

## Multi-Tenant Data Isolation
- Every database table has `createdBy` (userId) column
- All read queries filter by `ctx.user.id` — users CANNOT see other users' data
- Inbound leads auto-tagged to phone number owner via `getUserIdByPhoneNumber()`
- Templates: users see their own + system templates (createdBy IS NULL)

## API Security
- **Webhook Validation**: SignalWire signature verification on all voice/SMS webhooks
- **CSRF Protection**: SameSite cookie policy
- **SQL Injection**: All queries use Drizzle ORM parameterized queries
- **XSS Prevention**: React DOM escaping on all user-rendered content
- **Rate Limiting**: Express middleware on all API routes

## Data Encryption
- All data in transit: TLS 1.2+ (Railway infrastructure)
- Database connections: SSL enforced (`rejectUnauthorized: true`)
- Environment secrets: Railway encrypted variable storage
- No secrets in codebase (verified: no API keys in source)

## Compliance Readiness

### SOC 2 Type II Preparation
| Control | Status |
|---------|--------|
| Access Control | ✅ RBAC implemented |
| Data Isolation | ✅ Per-user tenant isolation |
| Audit Logging | ✅ Activity logs table |
| Encryption in Transit | ✅ TLS enforced |
| Monitoring | ✅ Health endpoint + Railway metrics |
| Incident Response | 🔄 Policy needed |
| Vendor Management | 🔄 BAAs needed |

### HIPAA Preparation (if applicable)
| Requirement | Status |
|-------------|--------|
| PHI Identification | ✅ No PHI stored by default |
| Access Controls | ✅ User-level isolation |
| Audit Controls | ✅ Activity logging |
| Transmission Security | ✅ TLS enforced |
| BAA with SignalWire | 🔄 Required if handling healthcare |
| BAA with OpenAI/Anthropic | 🔄 Required if handling healthcare |

### GDPR Preparation
| Requirement | Status |
|-------------|--------|
| Data Minimization | ✅ Only necessary fields collected |
| Right to Deletion | 🔄 `deleteLead`, `deleteCampaign` exist |
| Data Portability | 🔄 Export endpoint needed |
| Consent Tracking | 🔄 Required for marketing |
| Privacy Policy | 🔄 /privacy page exists |

## Infrastructure Security
- **Hosting**: Railway (SOC 2 Type II certified)
- **Database**: Railway MySQL (encrypted at rest)
- **Redis**: Railway Redis (encrypted at rest)
- **CDN**: Fastly (DDoS protection)
- **Domain**: HTTPS enforced, HSTS header

## Vulnerability Management
- Dependencies audited via `pnpm audit`
- No known CVEs in production dependencies
- AWS SDK removed (CVE remediation)

## Incident Response
1. Monitor Railway logs for anomalies
2. SignalWire alerts for call volume spikes
3. Database connection failures → automatic retry (3x)
4. Worker failures → BullMQ automatic retry

---
*Last updated: March 2026*
*Review cycle: Quarterly*
