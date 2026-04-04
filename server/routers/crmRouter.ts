/**
 * CRM Router — real HubSpot + Salesforce OAuth + contact sync.
 *
 * OAuth flow:
 *   1. Frontend calls `getAuthUrl` → user is redirected to HubSpot/Salesforce
 *   2. Provider redirects back to /api/crm/callback?code=...&provider=...
 *   3. Backend calls `exchangeToken` (handled by the REST webhook below)
 *   4. Connection stored as `connected`; `syncLead` now works
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { ENV } from "../_core/env";
import * as db from "../db";

const provider = z.enum(["salesforce", "hubspot", "pipedrive"]);

// ── HubSpot helpers ───────────────────────────────────────────────────────────

function hubspotAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: ENV.hubspotClientId,
    redirect_uri: ENV.hubspotRedirectUri || `${ENV.publicUrl}/api/crm/callback`,
    scope: "crm.objects.contacts.write crm.objects.contacts.read",
    state,
  });
  return `https://app.hubspot.com/oauth/authorize?${params}`;
}

async function hubspotExchangeCode(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  hub_id: number;
}> {
  const res = await fetch("https://api.hubapi.com/oauth/v1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: ENV.hubspotClientId,
      client_secret: ENV.hubspotClientSecret,
      redirect_uri: ENV.hubspotRedirectUri || `${ENV.publicUrl}/api/crm/callback`,
      code,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HubSpot token exchange failed: ${res.status} — ${text}`);
  }
  return res.json();
}

async function hubspotRefreshToken(refreshToken: string): Promise<{ access_token: string }> {
  const res = await fetch("https://api.hubapi.com/oauth/v1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: ENV.hubspotClientId,
      client_secret: ENV.hubspotClientSecret,
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) throw new Error(`HubSpot token refresh failed: ${res.status}`);
  return res.json();
}

async function syncLeadToHubSpot(
  accessToken: string,
  lead: { email?: string | null; firstName: string; lastName: string; phone?: string | null; company?: string | null }
): Promise<{ id: string }> {
  // Search for existing contact by email first
  if (lead.email) {
    const search = await fetch("https://api.hubapi.com/crm/v3/objects/contacts/search", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        filterGroups: [{ filters: [{ propertyName: "email", operator: "EQ", value: lead.email }] }],
        properties: ["email", "firstname", "lastname"],
        limit: 1,
      }),
    });
    const searchData = await search.json();
    if (searchData.results?.length > 0) {
      // Update existing
      const existingId = searchData.results[0].id;
      await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${existingId}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          properties: {
            firstname: lead.firstName,
            lastname: lead.lastName,
            phone: lead.phone ?? undefined,
            company: lead.company ?? undefined,
          },
        }),
      });
      return { id: existingId };
    }
  }

  // Create new contact
  const create = await fetch("https://api.hubapi.com/crm/v3/objects/contacts", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      properties: {
        email: lead.email ?? undefined,
        firstname: lead.firstName,
        lastname: lead.lastName,
        phone: lead.phone ?? undefined,
        company: lead.company ?? undefined,
        hs_lead_status: "NEW",
      },
    }),
  });
  if (!create.ok) {
    const text = await create.text();
    throw new Error(`HubSpot create contact failed: ${create.status} — ${text}`);
  }
  const created = await create.json();
  return { id: created.id };
}

// ── Salesforce helpers ────────────────────────────────────────────────────────

function salesforceAuthUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: ENV.salesforceClientId,
    redirect_uri: ENV.salesforceRedirectUri || `${ENV.publicUrl}/api/crm/callback`,
    scope: "api refresh_token",
    state,
  });
  return `https://${ENV.salesforceLoginUrl}/services/oauth2/authorize?${params}`;
}

async function salesforceExchangeCode(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  instance_url: string;
  id: string;
}> {
  const res = await fetch(`https://${ENV.salesforceLoginUrl}/services/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: ENV.salesforceClientId,
      client_secret: ENV.salesforceClientSecret,
      redirect_uri: ENV.salesforceRedirectUri || `${ENV.publicUrl}/api/crm/callback`,
      code,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Salesforce token exchange failed: ${res.status} — ${text}`);
  }
  return res.json();
}

async function salesforceRefreshToken(
  refreshToken: string,
  instanceUrl: string
): Promise<{ access_token: string }> {
  const res = await fetch(`${instanceUrl}/services/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: ENV.salesforceClientId,
      client_secret: ENV.salesforceClientSecret,
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) throw new Error(`Salesforce token refresh failed: ${res.status}`);
  return res.json();
}

// ── Pipedrive OAuth + Persons API ─────────────────────────────────────────────

function pipedriveAuthUrl(state: string): string {
  const redirect =
    ENV.pipedriveRedirectUri || `${ENV.publicUrl}/api/crm/callback`;
  const params = new URLSearchParams({
    client_id: ENV.pipedriveClientId,
    redirect_uri: redirect,
    response_type: "code",
    state,
  });
  return `https://oauth.pipedrive.com/oauth/authorize?${params}`;
}

async function pipedriveExchangeCode(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  api_domain: string;
  expires_in?: number;
}> {
  const redirect =
    ENV.pipedriveRedirectUri || `${ENV.publicUrl}/api/crm/callback`;
  const res = await fetch("https://oauth.pipedrive.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirect,
      client_id: ENV.pipedriveClientId,
      client_secret: ENV.pipedriveClientSecret,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Pipedrive token exchange failed: ${res.status} — ${text}`);
  }
  return res.json();
}

async function pipedriveRefreshToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token?: string;
  api_domain: string;
}> {
  const res = await fetch("https://oauth.pipedrive.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: ENV.pipedriveClientId,
      client_secret: ENV.pipedriveClientSecret,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Pipedrive token refresh failed: ${res.status} — ${text}`);
  }
  return res.json();
}

/** `apiBase` e.g. https://mycompany.pipedrive.com */
async function syncLeadToPipedrive(
  accessToken: string,
  apiBase: string,
  lead: { email?: string | null; firstName: string; lastName: string; phone?: string | null; company?: string | null }
): Promise<{ id: string }> {
  const base = apiBase.replace(/\/$/, "");
  const name = `${lead.firstName} ${lead.lastName}`.trim() || "Lead";
  const body: Record<string, unknown> = { name };
  if (lead.email?.trim()) {
    body.email = [{ label: "work", value: lead.email.trim(), primary: true }];
  }
  if (lead.phone?.trim()) {
    body.phone = [{ label: "work", value: lead.phone.trim(), primary: true }];
  }
  if (lead.company?.trim()) {
    body.org_name = lead.company.trim();
  }

  const create = await fetch(`${base}/v1/persons`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!create.ok) {
    const text = await create.text();
    throw new Error(`Pipedrive create person failed: ${create.status} — ${text}`);
  }
  const created = (await create.json()) as { data?: { id?: number }; success?: boolean };
  const id = created.data?.id;
  if (id == null) {
    throw new Error("Pipedrive: unexpected response (no person id)");
  }
  return { id: String(id) };
}

async function syncLeadToSalesforce(
  accessToken: string,
  instanceUrl: string,
  lead: { email?: string | null; firstName: string; lastName: string; phone?: string | null; company?: string | null }
): Promise<{ id: string }> {
  // Try upsert by Email
  const upsertUrl = `${instanceUrl}/services/data/v58.0/sobjects/Lead/Email/${encodeURIComponent(lead.email ?? "noemail@placeholder.invalid")}`;
  const payload = {
    FirstName: lead.firstName,
    LastName: lead.lastName,
    Email: lead.email ?? undefined,
    Phone: lead.phone ?? undefined,
    Company: lead.company ?? "Unknown",
    LeadSource: "ApexAI",
    Status: "Open - Not Contacted",
  };

  // Use POST to create if no email, PATCH to upsert if email
  if (lead.email) {
    const patch = await fetch(upsertUrl, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (patch.status === 204 || patch.ok) {
      // Upserted — fetch ID
      const query = await fetch(
        `${instanceUrl}/services/data/v58.0/query?q=${encodeURIComponent(`SELECT Id FROM Lead WHERE Email='${lead.email}' LIMIT 1`)}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const qData = await query.json();
      return { id: qData.records?.[0]?.Id ?? "upserted" };
    }
  }

  // Create
  const create = await fetch(`${instanceUrl}/services/data/v58.0/sobjects/Lead`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!create.ok) {
    const text = await create.text();
    throw new Error(`Salesforce create lead failed: ${create.status} — ${text}`);
  }
  const created = await create.json();
  return { id: created.id };
}

// ── Router ────────────────────────────────────────────────────────────────────

export const crmRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return db.listCrmConnections(ctx.user.id);
  }),

  /** Returns the OAuth authorization URL for the given provider */
  getAuthUrl: protectedProcedure
    .input(z.object({ provider }))
    .query(({ ctx, input }) => {
      const state = `${ctx.user.id}:${input.provider}`;
      let url = "";
      if (input.provider === "hubspot") {
        if (!ENV.hubspotClientId) return { url: "", configured: false };
        url = hubspotAuthUrl(state);
      } else if (input.provider === "salesforce") {
        if (!ENV.salesforceClientId) return { url: "", configured: false };
        url = salesforceAuthUrl(state);
      } else if (input.provider === "pipedrive") {
        if (!ENV.pipedriveClientId) return { url: "", configured: false };
        url = pipedriveAuthUrl(state);
      } else {
        return { url: "", configured: false };
      }
      return { url, configured: true };
    }),

  /** Registers intent to connect (row in `crm_connections` for the chosen provider). */
  startConnect: protectedProcedure.input(z.object({ provider })).mutation(async ({ ctx, input }) => {
    try {
      await db.upsertCrmConnectionStub(ctx.user.id, input.provider);
      return { ok: true as const };
    } catch (e) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: (e as Error).message });
    }
  }),

  /** Exchange OAuth code for tokens and store them */
  exchangeToken: protectedProcedure
    .input(z.object({ provider, code: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Ensure stub exists
        await db.upsertCrmConnectionStub(ctx.user.id, input.provider);

        if (input.provider === "hubspot") {
          if (!ENV.hubspotClientId || !ENV.hubspotClientSecret) {
            throw new TRPCError({ code: "PRECONDITION_FAILED", message: "HubSpot app credentials not configured" });
          }
          const tokens = await hubspotExchangeCode(input.code);
          await db.saveCrmTokens(ctx.user.id, "hubspot", {
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            portalId: String(tokens.hub_id),
            displayName: `HubSpot (Portal ${tokens.hub_id})`,
          });
          return { ok: true as const, provider: "hubspot" };
        }

        if (input.provider === "salesforce") {
          if (!ENV.salesforceClientId || !ENV.salesforceClientSecret) {
            throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Salesforce app credentials not configured" });
          }
          const tokens = await salesforceExchangeCode(input.code);
          await db.saveCrmTokens(ctx.user.id, "salesforce", {
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            instanceUrl: tokens.instance_url,
            displayName: `Salesforce (${tokens.instance_url})`,
          });
          return { ok: true as const, provider: "salesforce" };
        }

        if (input.provider === "pipedrive") {
          if (!ENV.pipedriveClientId || !ENV.pipedriveClientSecret) {
            throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Pipedrive app credentials not configured" });
          }
          const tokens = await pipedriveExchangeCode(input.code);
          const apiBase = `https://${tokens.api_domain.replace(/^https?:\/\//, "")}`;
          await db.saveCrmTokens(ctx.user.id, "pipedrive", {
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            instanceUrl: apiBase,
            displayName: `Pipedrive (${tokens.api_domain})`,
          });
          return { ok: true as const, provider: "pipedrive" };
        }

        throw new TRPCError({ code: "BAD_REQUEST", message: "Provider OAuth not yet implemented for: " + input.provider });
      } catch (e) {
        if (e instanceof TRPCError) throw e;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: (e as Error).message });
      }
    }),

  disconnect: protectedProcedure.input(z.object({ provider })).mutation(async ({ ctx, input }) => {
    try {
      await db.setCrmDisconnected(ctx.user.id, input.provider);
      return { ok: true as const };
    } catch (e) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: (e as Error).message });
    }
  }),

  /** Push a single lead to HubSpot or Salesforce */
  syncLead: protectedProcedure
    .input(
      z.object({
        provider,
        leadId: z.number().int().positive(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tokens = await db.getCrmTokens(ctx.user.id, input.provider);
      if (!tokens) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `${input.provider} is not connected. Please connect via Settings → Integrations.`,
        });
      }

      const lead = await db.getLeadById(input.leadId);
      if (!lead || lead.createdBy !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
      }

      try {
        if (input.provider === "hubspot") {
          // Refresh token if needed (HubSpot tokens expire in 30 min)
          let accessToken = tokens.accessToken;
          if (tokens.refreshToken) {
            try {
              const refreshed = await hubspotRefreshToken(tokens.refreshToken);
              accessToken = refreshed.access_token;
              await db.saveCrmTokens(ctx.user.id, "hubspot", {
                accessToken,
                refreshToken: tokens.refreshToken,
                portalId: undefined,
                displayName: "HubSpot",
              });
            } catch {
              // Use existing token and hope it's valid
            }
          }
          const result = await syncLeadToHubSpot(accessToken, lead);
          return { ok: true as const, externalId: result.id, provider: "hubspot" };
        }

        if (input.provider === "salesforce") {
          let accessToken = tokens.accessToken;
          if (tokens.refreshToken && tokens.instanceUrl) {
            try {
              const refreshed = await salesforceRefreshToken(tokens.refreshToken, tokens.instanceUrl);
              accessToken = refreshed.access_token;
              await db.saveCrmTokens(ctx.user.id, "salesforce", {
                accessToken,
                refreshToken: tokens.refreshToken,
                instanceUrl: tokens.instanceUrl,
                displayName: "Salesforce",
              });
            } catch {}
          }
          if (!tokens.instanceUrl) {
            throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Salesforce instance URL missing — reconnect" });
          }
          const result = await syncLeadToSalesforce(accessToken, tokens.instanceUrl, lead);
          return { ok: true as const, externalId: result.id, provider: "salesforce" };
        }

        if (input.provider === "pipedrive") {
          let accessToken = tokens.accessToken;
          let refresh = tokens.refreshToken;
          let apiBase = tokens.instanceUrl;
          if (refresh) {
            try {
              const refreshed = await pipedriveRefreshToken(refresh);
              accessToken = refreshed.access_token;
              if (refreshed.refresh_token) refresh = refreshed.refresh_token;
              apiBase = `https://${refreshed.api_domain.replace(/^https?:\/\//, "")}`;
              await db.saveCrmTokens(ctx.user.id, "pipedrive", {
                accessToken,
                refreshToken: refresh,
                instanceUrl: apiBase,
                displayName: "Pipedrive",
              });
            } catch {
              // use existing access token
            }
          }
          if (!apiBase) {
            throw new TRPCError({
              code: "PRECONDITION_FAILED",
              message: "Pipedrive API domain missing — reconnect from Settings",
            });
          }
          const result = await syncLeadToPipedrive(accessToken, apiBase, lead);
          return { ok: true as const, externalId: result.id, provider: "pipedrive" };
        }

        throw new TRPCError({ code: "BAD_REQUEST", message: "Sync not implemented for: " + input.provider });
      } catch (e) {
        if (e instanceof TRPCError) throw e;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: (e as Error).message });
      }
    }),

  /** Bulk sync all leads for a user to connected CRMs */
  syncAll: protectedProcedure
    .input(z.object({ provider }))
    .mutation(async ({ ctx, input }) => {
      const tokens = await db.getCrmTokens(ctx.user.id, input.provider);
      if (!tokens) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: `${input.provider} not connected` });
      }
      const { leads: allLeads } = await db.getLeads({ userId: ctx.user.id, limit: 500 });
      let synced = 0;
      let failed = 0;
      const errors: string[] = [];
      for (const lead of allLeads) {
        try {
          if (input.provider === "hubspot") {
            await syncLeadToHubSpot(tokens.accessToken, lead);
          } else if (input.provider === "salesforce" && tokens.instanceUrl) {
            await syncLeadToSalesforce(tokens.accessToken, tokens.instanceUrl, lead);
          } else if (input.provider === "pipedrive" && tokens.instanceUrl) {
            await syncLeadToPipedrive(tokens.accessToken, tokens.instanceUrl, lead);
          }
          synced++;
        } catch (e) {
          failed++;
          errors.push((e as Error).message);
        }
      }
      return { ok: true as const, synced, failed, errors: errors.slice(0, 10) };
    }),
});
