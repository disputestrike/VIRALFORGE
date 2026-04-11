import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  Building2, Plus, Phone, DollarSign, Users, Activity,
  MoreVertical, PhoneCall, Settings, Trash2, RefreshCw,
  CheckCircle2, Clock, XCircle, TrendingUp
} from "lucide-react";
import { toast } from "sonner";
import { SELF_SERVE_PLANS } from "@/lib/pricing";

const INDUSTRIES = ["Solar","HVAC","Roofing","Real Estate","Insurance","Credit Repair","General"];
const PLANS = SELF_SERVE_PLANS.map((plan) => ({
  id: plan.id,
  label: plan.name,
  minutes: plan.minutes,
  price: plan.price,
}));

const STATUS_CONFIG: Record<string, { color: string; icon: any; label: string }> = {
  active:    { color: "#34d399", icon: CheckCircle2, label: "Active" },
  paused:    { color: "#fbbf24", icon: Clock,        label: "Paused" },
  cancelled: { color: "#f87171", icon: XCircle,      label: "Cancelled" },
  pending:   { color: "#60a5fa", icon: Activity,     label: "Pending" },
};

export default function Agency() {
  const utils = trpc.useUtils();
  const [showAdd, setShowAdd] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [form, setForm] = useState({
    clientName: "", clientEmail: "", clientPhone: "",
    businessName: "", industry: "Solar", plan: "starter",
    monthlyRate: "149", minutesIncluded: "500", notes: "",
  });

  const { data: stats } = trpc.agency.stats.useQuery();
  const { data: clients, isLoading } = trpc.agency.listClients.useQuery();

  const addMutation = trpc.agency.addClient.useMutation({
    onSuccess: () => {
      toast.success("Client added successfully");
      utils.agency.listClients.invalidate();
      utils.agency.stats.invalidate();
      setShowAdd(false);
      setForm({ clientName: "", clientEmail: "", clientPhone: "", businessName: "", industry: "Solar", plan: "starter", monthlyRate: "149", minutesIncluded: "500", notes: "" });
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.agency.updateClient.useMutation({
    onSuccess: () => { toast.success("Client updated"); utils.agency.listClients.invalidate(); utils.agency.stats.invalidate(); setSelectedClient(null); },
    onError: (e) => toast.error(e.message),
  });

  const provisionMutation = trpc.agency.provisionClientNumber.useMutation({
    onSuccess: (data) => { toast.success(`AI number provisioned: ${data.phoneNumber}`); utils.agency.listClients.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const removeMutation = trpc.agency.removeClient.useMutation({
    onSuccess: () => { toast.success("Client cancelled"); utils.agency.listClients.invalidate(); utils.agency.stats.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const handleAdd = () => {
    if (!form.clientName.trim()) { toast.error("Client name is required"); return; }
    addMutation.mutate({
      clientName: form.clientName,
      clientEmail: form.clientEmail || undefined,
      clientPhone: form.clientPhone || undefined,
      businessName: form.businessName || undefined,
      industry: form.industry,
      plan: form.plan,
      monthlyRate: parseFloat(form.monthlyRate) || 149,
      minutesIncluded: parseInt(form.minutesIncluded) || 500,
      notes: form.notes || undefined,
    });
  };

  const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 0 });

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agency Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your client accounts and AI deployments</p>
        </div>
        <Button onClick={() => setShowAdd(true)} style={{ backgroundColor: "#1d6ff4" }}>
          <Plus className="w-4 h-4 mr-2" /> Add Client
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Clients", value: stats?.totalClients ?? 0, icon: Users, color: "#60a5fa" },
          { label: "Active Clients", value: stats?.activeClients ?? 0, icon: Activity, color: "#34d399" },
          { label: "Monthly Revenue", value: `$${fmt(stats?.monthlyRevenue ?? 0)}`, icon: DollarSign, color: "#c084fc" },
          { label: "Total Minutes Used", value: fmt(stats?.totalMinutes ?? 0), icon: Phone, color: "#fbbf24" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Icon className="w-5 h-5 flex-shrink-0" style={{ color }} />
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-xl font-bold">{value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue insight */}
      {(stats?.activeClients ?? 0) > 0 && (
        <div className="p-4 rounded-xl border border-green-500/20 bg-green-500/5 flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-green-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-white">
              You're generating <span className="text-green-400">${fmt(stats?.monthlyRevenue ?? 0)}/mo</span> from {stats?.activeClients} active clients
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Add more clients to grow your recurring revenue
            </p>
          </div>
        </div>
      )}

      {/* Client list */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            Client Accounts ({clients?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading clients...</div>
          ) : !clients?.length ? (
            <div className="p-8 text-center">
              <Building2 className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
              <p className="text-muted-foreground text-sm">No clients yet.</p>
              <Button className="mt-4" size="sm" onClick={() => setShowAdd(true)} style={{ backgroundColor: "#1d6ff4" }}>
                <Plus className="w-4 h-4 mr-2" /> Add Your First Client
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {["Client","Business","Industry","Plan","AI Number","Minutes","Revenue","Status","Actions"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {clients.map((c: any) => {
                    const sc = STATUS_CONFIG[c.status] || STATUS_CONFIG.active;
                    const StatusIcon = sc.icon;
                    const pct = c.minutesIncluded > 0 ? Math.round((c.minutesUsed / c.minutesIncluded) * 100) : 0;
                    return (
                      <tr key={c.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium">{c.clientName}</p>
                          <p className="text-xs text-muted-foreground">{c.clientEmail}</p>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{c.businessName || "—"}</td>
                        <td className="px-4 py-3">
                          {c.industry ? (
                            <Badge variant="outline" className="text-xs">{c.industry}</Badge>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3 capitalize">{c.plan}</td>
                        <td className="px-4 py-3">
                          {c.aiPhoneNumber ? (
                            <span className="font-mono text-xs text-green-400">{c.aiPhoneNumber}</span>
                          ) : (
                            <Button size="sm" variant="outline" className="text-xs h-7 px-2"
                              onClick={() => provisionMutation.mutate({ clientId: c.id })}
                              disabled={provisionMutation.isPending}>
                              <Phone className="w-3 h-3 mr-1" />
                              {provisionMutation.isPending ? "..." : "Provision"}
                            </Button>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-secondary rounded-full h-1.5 w-16">
                              <div className="h-1.5 rounded-full" style={{ width: `${Math.min(pct,100)}%`, backgroundColor: pct > 80 ? "#f87171" : "#34d399" }} />
                            </div>
                            <span className="text-xs text-muted-foreground">{c.minutesUsed}/{c.minutesIncluded}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-medium text-green-400">${c.monthlyRate}/mo</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <StatusIcon className="w-3.5 h-3.5" style={{ color: sc.color }} />
                            <span className="text-xs" style={{ color: sc.color }}>{sc.label}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                              onClick={() => setSelectedClient(c)}>
                              <Settings className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive"
                              onClick={() => { if (confirm(`Cancel ${c.clientName}?`)) removeMutation.mutate({ id: c.id }); }}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Client Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Client</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Client Name *</Label>
                <Input placeholder="John Smith" value={form.clientName}
                  onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))}
                  className="bg-secondary border-border" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Business Name</Label>
                <Input placeholder="Smith Solar LLC" value={form.businessName}
                  onChange={e => setForm(f => ({ ...f, businessName: e.target.value }))}
                  className="bg-secondary border-border" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Client Email</Label>
                <Input type="email" placeholder="john@business.com" value={form.clientEmail}
                  onChange={e => setForm(f => ({ ...f, clientEmail: e.target.value }))}
                  className="bg-secondary border-border" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Client Phone</Label>
                <Input placeholder="+1 (555) 000-0000" value={form.clientPhone}
                  onChange={e => setForm(f => ({ ...f, clientPhone: e.target.value }))}
                  className="bg-secondary border-border" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Industry</Label>
                <select value={form.industry} onChange={e => setForm(f => ({ ...f, industry: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-sm bg-secondary border border-border">
                  {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Plan</Label>
                <select value={form.plan} onChange={e => {
                    const p = PLANS.find(pl => pl.id === e.target.value);
                    setForm(f => ({ ...f, plan: e.target.value, minutesIncluded: String(p?.minutes || 500), monthlyRate: String(p?.price || 149) }));
                  }}
                  className="w-full px-3 py-2 rounded-lg text-sm bg-secondary border border-border">
                  {PLANS.map(p => <option key={p.id} value={p.id}>{p.label} — {p.minutes} min</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Monthly Rate (what you charge)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <Input type="number" value={form.monthlyRate}
                    onChange={e => setForm(f => ({ ...f, monthlyRate: e.target.value }))}
                    className="bg-secondary border-border pl-7" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Minutes Included</Label>
                <Input type="number" value={form.minutesIncluded}
                  onChange={e => setForm(f => ({ ...f, minutesIncluded: e.target.value }))}
                  className="bg-secondary border-border" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notes (internal)</Label>
              <Input placeholder="Any notes about this client..." value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                className="bg-secondary border-border" />
            </div>
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-muted-foreground">
              After adding the client, use the <strong className="text-foreground">Provision</strong> button to automatically buy them an AI phone number.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={addMutation.isPending} style={{ backgroundColor: "#1d6ff4" }}>
              {addMutation.isPending ? "Adding..." : "Add Client"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Client Dialog */}
      {selectedClient && (
        <Dialog open={!!selectedClient} onOpenChange={() => setSelectedClient(null)}>
          <DialogContent className="max-w-md bg-card border-border">
            <DialogHeader>
              <DialogTitle>Edit — {selectedClient.clientName}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {[
                { key: "clientName", label: "Client Name" },
                { key: "businessName", label: "Business Name" },
                { key: "clientEmail", label: "Email" },
                { key: "transferNumber", label: "Transfer Number (for live handoffs)" },
              ].map(({ key, label }) => (
                <div key={key} className="space-y-1.5">
                  <Label className="text-xs">{label}</Label>
                  <Input
                    value={selectedClient[key] || ""}
                    onChange={e => setSelectedClient((c: any) => ({ ...c, [key]: e.target.value }))}
                    className="bg-secondary border-border" />
                </div>
              ))}
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <select value={selectedClient.status}
                  onChange={e => setSelectedClient((c: any) => ({ ...c, status: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-sm bg-secondary border border-border">
                  {["active","paused","cancelled","pending"].map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Monthly Rate</Label>
                  <Input type="number" value={selectedClient.monthlyRate || ""}
                    onChange={e => setSelectedClient((c: any) => ({ ...c, monthlyRate: parseFloat(e.target.value) }))}
                    className="bg-secondary border-border" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Minutes Included</Label>
                  <Input type="number" value={selectedClient.minutesIncluded || ""}
                    onChange={e => setSelectedClient((c: any) => ({ ...c, minutesIncluded: parseInt(e.target.value) }))}
                    className="bg-secondary border-border" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedClient(null)}>Cancel</Button>
              <Button onClick={() => updateMutation.mutate({ id: selectedClient.id, ...selectedClient })}
                disabled={updateMutation.isPending} style={{ backgroundColor: "#1d6ff4" }}>
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
