import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GitBranch, Plus, Loader2, Play, Pause, Trash2 } from "lucide-react";
import { toast } from "sonner";

const TRIGGERS = [
  { value: "call.completed", label: "After call completes" },
  { value: "lead.created", label: "New lead created" },
  { value: "appointment.booked", label: "Appointment booked" },
  { value: "lead.scored", label: "Lead scored above threshold" },
  { value: "manual", label: "Manual trigger" },
];

const ACTIONS = [
  { value: "send_sms", label: "Send SMS follow-up" },
  { value: "send_email", label: "Send email" },
  { value: "update_crm", label: "Update CRM" },
  { value: "create_ticket", label: "Create support ticket" },
  { value: "webhook", label: "Send webhook" },
];

export default function WorkflowsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", trigger: "call.completed", action: "send_sms" });
  const utils = trpc.useUtils();

  const { data: workflows, isLoading } = trpc.workflows.list.useQuery();

  const upsertMutation = trpc.workflows.upsert.useMutation({
    onSuccess: () => { toast.success("Workflow saved"); utils.workflows.list.invalidate(); setShowCreate(false); setForm({ name: "", trigger: "call.completed", action: "send_sms" }); },
    onError: (e) => toast.error(e.message),
  });

  const removeMutation = trpc.workflows.remove.useMutation({
    onSuccess: () => { toast.success("Workflow deleted"); utils.workflows.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const toggleActive = (w: any) => {
    upsertMutation.mutate({ id: w.id, name: w.name, definition: w.definition || {}, isActive: !w.isActive });
  };

  const wfList = (workflows ?? []) as any[];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Workflows</h1>
          <p className="text-muted-foreground">Automate post-call actions — follow-up SMS, emails, CRM updates, and more.</p>
        </div>
        <Button onClick={() => setShowCreate(true)}><Plus className="size-4 mr-2" /> New Workflow</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
      ) : wfList.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {wfList.map((w: any) => (
            <Card key={w.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{w.name}</CardTitle>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${w.isActive ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"}`}>
                    {w.isActive ? "Active" : "Paused"}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2">{w.description || "No description"}</p>
                <div className="text-xs text-muted-foreground mb-4">Trigger: <span className="font-medium text-foreground">{w.trigger || "manual"}</span></div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => toggleActive(w)} disabled={upsertMutation.isPending}>
                    {w.isActive ? <><Pause className="size-3 mr-1" /> Pause</> : <><Play className="size-3 mr-1" /> Activate</>}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => removeMutation.mutate({ id: w.id })} disabled={removeMutation.isPending}>
                    <Trash2 className="size-3 text-red-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <GitBranch className="size-10 mx-auto text-muted-foreground/30 mb-3" />
            <p className="font-medium">No workflows yet</p>
            <p className="text-sm text-muted-foreground mt-1">Create your first workflow to automate post-call actions.</p>
            <Button className="mt-4" onClick={() => setShowCreate(true)}><Plus className="size-4 mr-2" /> Create Workflow</Button>
          </CardContent>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Workflow</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Workflow Name</Label>
              <Input placeholder="e.g. Post-call SMS follow-up" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Trigger</Label>
              <Select value={form.trigger} onValueChange={(v) => setForm(f => ({ ...f, trigger: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRIGGERS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Action</Label>
              <Select value={form.action} onValueChange={(v) => setForm(f => ({ ...f, action: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACTIONS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={() => upsertMutation.mutate({ name: form.name, definition: { trigger: form.trigger, action: form.action }, isActive: true })} disabled={!form.name.trim() || upsertMutation.isPending}>
              {upsertMutation.isPending ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
              Create Workflow
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
