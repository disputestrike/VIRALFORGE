import { ENV } from "../env";
import * as db from "../../db";

type ConnectedProvider = "hubspot" | "salesforce" | "pipedrive";

type SyncLogger = (message: string) => void;

type SyncResult = {
  provider: ConnectedProvider;
  ok: boolean;
  externalId?: string;
  error?: string;
};

type SyncLead = {
  email?: string | null;
  firstName: string;
  lastName: string;
  phone?: string | null;
  company?: string | null;
};

async function hubspotRefreshToken(
  refreshToken: string
): Promise<{ access_token: string }> {
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
  lead: SyncLead
): Promise<{ id: string }> {
  if (lead.email) {
    const search = await fetch(
      "https://api.hubapi.com/crm/v3/objects/contacts/search",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filterGroups: [
            {
              filters: [
                { propertyName: "email", operator: "EQ", value: lead.email },
              ],
            },
          ],
          properties: ["email", "firstname", "lastname"],
          limit: 1,
        }),
      }
    );
    const searchData = (await search.json().catch(() => ({}))) as {
      results?: Array<{ id: string }>;
    };
    const existingId = searchData.results?.[0]?.id;
    if (existingId) {
      await fetch(
        `https://api.hubapi.com/crm/v3/objects/contacts/${existingId}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            properties: {
              firstname: lead.firstName,
              lastname: lead.lastName,
              phone: lead.phone ?? undefined,
              company: lead.company ?? undefined,
            },
          }),
        }
      );
      return { id: existingId };
    }
  }

  const create = await fetch("https://api.hubapi.com/crm/v3/objects/contacts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
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
    throw new Error(`HubSpot create contact failed: ${create.status} - ${text}`);
  }
  const created = (await create.json()) as { id: string };
  return { id: created.id };
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

async function syncLeadToSalesforce(
  accessToken: string,
  instanceUrl: string,
  lead: SyncLead
): Promise<{ id: string }> {
  const payload = {
    FirstName: lead.firstName,
    LastName: lead.lastName,
    Email: lead.email ?? undefined,
    Phone: lead.phone ?? undefined,
    Company: lead.company ?? "Unknown",
    LeadSource: "ApexAI",
    Status: "Open - Not Contacted",
  };

  if (lead.email) {
    const upsertUrl = `${instanceUrl}/services/data/v58.0/sobjects/Lead/Email/${encodeURIComponent(
      lead.email
    )}`;
    const patch = await fetch(upsertUrl, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (patch.status === 204 || patch.ok) {
      const query = await fetch(
        `${instanceUrl}/services/data/v58.0/query?q=${encodeURIComponent(
          `SELECT Id FROM Lead WHERE Email='${lead.email}' LIMIT 1`
        )}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const qData = (await query.json().catch(() => ({}))) as {
        records?: Array<{ Id?: string }>;
      };
      return { id: qData.records?.[0]?.Id ?? "upserted" };
    }
  }

  const create = await fetch(`${instanceUrl}/services/data/v58.0/sobjects/Lead`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!create.ok) {
    const text = await create.text();
    throw new Error(`Salesforce create lead failed: ${create.status} - ${text}`);
  }
  const created = (await create.json()) as { id: string };
  return { id: created.id };
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
    throw new Error(`Pipedrive token refresh failed: ${res.status} - ${text}`);
  }
  return res.json();
}

async function syncLeadToPipedrive(
  accessToken: string,
  apiBase: string,
  lead: SyncLead
): Promise<{ id: string }> {
  const base = apiBase.replace(/\/$/, "");
  const body: Record<string, unknown> = {
    name: `${lead.firstName} ${lead.lastName}`.trim() || "Lead",
  };
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
    throw new Error(`Pipedrive create person failed: ${create.status} - ${text}`);
  }
  const created = (await create.json()) as { data?: { id?: number } };
  const id = created.data?.id;
  if (id == null) {
    throw new Error("Pipedrive create person failed: missing id");
  }
  return { id: String(id) };
}

async function refreshProviderTokens(
  userId: number,
  provider: ConnectedProvider,
  tokens: { accessToken: string; refreshToken?: string; instanceUrl?: string }
): Promise<{ accessToken: string; refreshToken?: string; instanceUrl?: string }> {
  if (provider === "hubspot" && tokens.refreshToken) {
    const refreshed = await hubspotRefreshToken(tokens.refreshToken);
    await db.saveCrmTokens(userId, "hubspot", {
      accessToken: refreshed.access_token,
      refreshToken: tokens.refreshToken,
      displayName: "HubSpot",
    });
    return { ...tokens, accessToken: refreshed.access_token };
  }

  if (
    provider === "salesforce" &&
    tokens.refreshToken &&
    tokens.instanceUrl
  ) {
    const refreshed = await salesforceRefreshToken(
      tokens.refreshToken,
      tokens.instanceUrl
    );
    await db.saveCrmTokens(userId, "salesforce", {
      accessToken: refreshed.access_token,
      refreshToken: tokens.refreshToken,
      instanceUrl: tokens.instanceUrl,
      displayName: "Salesforce",
    });
    return { ...tokens, accessToken: refreshed.access_token };
  }

  if (provider === "pipedrive" && tokens.refreshToken) {
    const refreshed = await pipedriveRefreshToken(tokens.refreshToken);
    await db.saveCrmTokens(userId, "pipedrive", {
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token ?? tokens.refreshToken,
      instanceUrl: refreshed.api_domain || tokens.instanceUrl,
      displayName: "Pipedrive",
    });
    return {
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token ?? tokens.refreshToken,
      instanceUrl: refreshed.api_domain || tokens.instanceUrl,
    };
  }

  return tokens;
}

export async function syncLeadToConnectedCrms(
  userId: number,
  leadId: number,
  log?: SyncLogger
): Promise<SyncResult[]> {
  const connections = await db.listCrmConnections(userId);
  const connected = connections.filter(
    (connection) => connection.status === "connected"
  ) as Array<{ provider: ConnectedProvider }>;
  if (!connected.length) return [];

  const lead = await db.getLeadById(leadId);
  if (!lead) return [];
  const payload: SyncLead = {
    email: lead.email ?? undefined,
    firstName: lead.firstName,
    lastName: lead.lastName,
    phone: lead.phone ?? undefined,
    company: lead.company ?? undefined,
  };

  const results: SyncResult[] = [];
  for (const connection of connected) {
    const provider = connection.provider;
    try {
      const storedTokens = await db.getCrmTokens(userId, provider);
      if (!storedTokens) {
        results.push({
          provider,
          ok: false,
          error: "Missing CRM tokens",
        });
        continue;
      }

      const tokens = await refreshProviderTokens(userId, provider, storedTokens);
      let externalId = "";
      if (provider === "hubspot") {
        externalId = (await syncLeadToHubSpot(tokens.accessToken, payload)).id;
      } else if (provider === "salesforce") {
        if (!tokens.instanceUrl) {
          throw new Error("Salesforce instance URL missing");
        }
        externalId = (
          await syncLeadToSalesforce(tokens.accessToken, tokens.instanceUrl, payload)
        ).id;
      } else {
        if (!tokens.instanceUrl) {
          throw new Error("Pipedrive API domain missing");
        }
        externalId = (
          await syncLeadToPipedrive(tokens.accessToken, tokens.instanceUrl, payload)
        ).id;
      }

      await db.logActivity({
        userId,
        entityType: "crm_sync",
        entityId: leadId,
        action: "synced",
        description: `Lead ${leadId} synced to ${provider}`,
        metadata: { provider, externalId },
      });

      const message = `[CRM] Auto-synced lead ${leadId} to ${provider}`;
      log?.(message);
      results.push({ provider, ok: true, externalId });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error ?? "Unknown error");
      log?.(`[CRM] Auto-sync to ${provider} failed: ${message}`);
      results.push({ provider, ok: false, error: message });
    }
  }

  return results;
}
