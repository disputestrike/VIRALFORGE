# CRM integrations — staging checklist

Use with **Settings → CRM connections** and `server/routers/crmRouter.ts`. Row 10 in [`CROSSWALK.md`](../integration/CROSSWALK.md).

---

## Env (Railway / server)

| Provider | Variables |
|----------|-----------|
| HubSpot | `HUBSPOT_CLIENT_ID`, `HUBSPOT_CLIENT_SECRET`, optional `HUBSPOT_REDIRECT_URI` |
| Salesforce | `SALESFORCE_CLIENT_ID`, `SALESFORCE_CLIENT_SECRET`, optional `SALESFORCE_REDIRECT_URI`, `SALESFORCE_LOGIN_URL` |
| Pipedrive | `PIPEDRIVE_CLIENT_ID`, `PIPEDRIVE_CLIENT_SECRET`, optional `PIPEDRIVE_REDIRECT_URI` |

Default redirect if unset: `{PUBLIC_URL}/api/crm/callback` (see `server/_core/env.ts` `publicUrl`).

## Per vendor (HubSpot / Salesforce / Pipedrive)

1. **Sandbox tenant** — Use a non-production CRM org first; confirm OAuth app client id/secret in Railway env if required by your implementation.
2. **Redirect URL** — Must match the callback URL your server exposes (Railway public domain + **`/api/crm/callback`**).
3. **Connect flow** — From Settings, **Register** → complete OAuth in browser → confirm row shows **connected** (or equivalent status) and `displayName` if returned.
4. **Minimal sync proof** — On **Leads**, use the **cloud** menu on a row → **HubSpot** or **Salesforce** (must show connected). Confirm the contact/lead appears in the CRM.
5. **Disconnect** — Confirm **Disconnect** clears tokens / status and a reconnect works.

---

## Automated proof (repo)

- `pnpm run check` / `pnpm run test` after changing `crmRouter.ts` or CRM-related `db.ts` helpers.
- No substitute for OAuth + API keys in a real staging environment.

---

## Sign-off

| Vendor | Staging date | Operator |
|--------|--------------|----------|
| HubSpot | | |
| Salesforce | | |
| Pipedrive | | OAuth + person create via `crm.syncLead` |
