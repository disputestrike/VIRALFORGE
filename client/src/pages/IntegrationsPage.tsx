import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plug, Globe, Mail, MessageCircle, Share2, Webhook, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

const CRM_PROVIDERS = [
  { id: "hubspot", name: "HubSpot", desc: "Sync leads and calls to HubSpot CRM", color: "#FF7A59" },
  { id: "salesforce", name: "Salesforce", desc: "Push qualified leads to Salesforce", color: "#00A1E0" },
  { id: "pipedrive", name: "Pipedrive", desc: "Auto-create deals in Pipedrive", color: "#015C3B" },
];

export default function IntegrationsPage() {
  const utils = trpc.useUtils();
  const { data: crmList, isLoading: crmLoading } = trpc.crm.list.useQuery();
  const { data: zapier } = trpc.zapier.get.useQuery();
  const { data: webchat } = trpc.webchat.list.useQuery();
  const { data: social } = trpc.social.list.useQuery();

  const crmConnect = trpc.crm.startConnect.useMutation({
    onSuccess: () => { toast.success("CRM connected"); utils.crm.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const crmDisconnect = trpc.crm.disconnect.useMutation({
    onSuccess: () => { toast.success("CRM disconnected"); utils.crm.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const isConnected = (provider: string) =>
    (crmList as any[])?.some((c: any) => c.provider === provider && c.status === "connected");

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Integrations</h1>
        <p className="text-muted-foreground">Connect ApexAI to your CRM, Zapier, webchat, email, and social channels.</p>
      </div>

      {/* CRM */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><Globe className="size-5" /> CRM Integrations</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {CRM_PROVIDERS.map((crm) => {
            const connected = isConnected(crm.id);
            return (
              <Card key={crm.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="size-10 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: crm.color }}>
                      {crm.name[0]}
                    </div>
                    <div>
                      <p className="font-medium">{crm.name}</p>
                      <p className="text-xs text-muted-foreground">{crm.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`flex items-center gap-1 text-xs ${connected ? "text-green-600" : "text-muted-foreground"}`}>
                      {connected ? <><CheckCircle2 className="size-3" /> Connected</> : <><XCircle className="size-3" /> Not connected</>}
                    </span>
                    <Button
                      size="sm"
                      variant={connected ? "outline" : "default"}
                      onClick={() => connected
                        ? crmDisconnect.mutate({ provider: crm.id as any })
                        : crmConnect.mutate({ provider: crm.id as any })
                      }
                      disabled={crmConnect.isPending || crmDisconnect.isPending}
                    >
                      {connected ? "Disconnect" : "Connect"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Zapier */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Webhook className="size-5" /> Zapier Webhook</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">Send call events to 8,000+ apps via Zapier. Paste your Zapier webhook URL below.</p>
          <div className="flex items-center gap-2">
            <code className="text-xs bg-muted px-3 py-2 rounded flex-1 truncate">
              {(zapier as any)?.targetUrl || "No webhook URL configured — set one in Settings → Zapier"}
            </code>
            <span className={`text-xs font-medium px-2 py-1 rounded ${(zapier as any)?.targetUrl ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
              {(zapier as any)?.targetUrl ? "Active" : "Not set"}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Other channels */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6 text-center">
            <MessageCircle className="size-8 mx-auto mb-2 text-blue-500" />
            <p className="font-medium">Webchat</p>
            <p className="text-xs text-muted-foreground mt-1">{(webchat as any[])?.length ?? 0} widget(s) configured</p>
            <p className="text-xs text-muted-foreground">Embed AI chat on your website</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Share2 className="size-8 mx-auto mb-2 text-purple-500" />
            <p className="font-medium">Social Channels</p>
            <p className="text-xs text-muted-foreground mt-1">{(social as any[])?.length ?? 0} channel(s) connected</p>
            <p className="text-xs text-muted-foreground">WhatsApp, Instagram, Facebook</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Mail className="size-8 mx-auto mb-2 text-orange-500" />
            <p className="font-medium">Email Sequences</p>
            <p className="text-xs text-muted-foreground mt-1">Automated follow-up drip campaigns</p>
            <p className="text-xs text-muted-foreground">Powered by Resend</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
