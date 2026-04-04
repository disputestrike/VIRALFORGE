# CRM integrations — staging checklist

Use with **Settings → CRM connections** and `server/routers/crmRouter.ts`. Row 10 in [`CROSSWALK.md`](../integration/CROSSWALK.md).

---

## Per vendor (HubSpot / Salesforce / Pipedrive)

1. **Sandbox tenant** — Use a non-production CRM org first; confirm OAuth app client id/secret in Railway env if required by your implementation.
2. **Redirect URL** — Must match the callback URL your server exposes (Railway public domain + route defined in `crmRouter` / OAuth handler).
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
| Pipedrive | | |
