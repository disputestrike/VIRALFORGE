import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GitBranch, Plus, Loader2, Play, Pause, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function WorkflowsPage() {
  const utils = trpc.useUtils();
  const { data: workflows, isLoading } = trpc.workflows.list.useQuery();
  const toggleMutation = trpc.workflows.toggle.useMutation({
    onSuccess: () => { toast.success("Workflow updated"); utils.workflows.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.workflows.delete.useMutation({
    onSuccess: () => { toast.success("Workflow deleted"); utils.workflows.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Workflows</h1>
          <p className="text-muted-foreground">Automate post-call actions — follow-up emails, CRM updates, lead scoring, and more.</p>
        </div>
        <Button><Plus className="size-4 mr-2" /> New Workflow</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
      ) : (workflows as any[])?.length ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {(workflows as any[]).map((w: any) => (
            <Card key={w.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{w.name}</CardTitle>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${w.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {w.isActive ? "Active" : "Paused"}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">{w.description || "No description"}</p>
                <div className="text-xs text-muted-foreground mb-3">Trigger: <span className="font-medium text-foreground">{w.trigger || "manual"}</span></div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => toggleMutation.mutate({ id: w.id })}>
                    {w.isActive ? <><Pause className="size-3 mr-1" /> Pause</> : <><Play className="size-3 mr-1" /> Activate</>}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate({ id: w.id })}><Trash2 className="size-3 text-red-500" /></Button>
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
            <Button className="mt-4"><Plus className="size-4 mr-2" /> Create Workflow</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
