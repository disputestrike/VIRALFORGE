import React from "react";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Calendar, Clock, User, Phone, CheckCircle2, XCircle,
  AlertCircle, Plus, ExternalLink, RefreshCw, Filter
} from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  proposed:  "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  confirmed: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  completed: "bg-green-500/10 text-green-400 border-green-500/30",
  cancelled: "bg-red-500/10 text-red-400 border-red-500/30",
  declined:  "bg-gray-500/10 text-gray-400 border-gray-500/30",
};

const SHOW_COLORS: Record<string, string> = {
  pending:     "bg-gray-500/10 text-gray-400 border-gray-500/30",
  showed:      "bg-green-500/10 text-green-400 border-green-500/30",
  no_show:     "bg-red-500/10 text-red-400 border-red-500/30",
  rescheduled: "bg-orange-500/10 text-orange-400 border-orange-500/30",
};

const GCAL_URL = import.meta.env.VITE_GCAL_BOOKING_URL || "";

export default function AppointmentsPage() {
  const [filter, setFilter] = useState<"all" | "upcoming" | "completed">("upcoming");
  const [showCreate, setShowCreate] = useState(false);
  const [newAppt, setNewAppt] = useState({ leadId: "", scheduledTime: "", duration: "30", notes: "", timezone: "America/New_York" });

  const { data: appointments, refetch, isLoading } = trpc.appointments.list.useQuery(
    filter === "upcoming" ? { upcoming: true } : filter === "completed" ? { status: "completed" } : {}
  );

  const { data: stats } = trpc.appointments.stats.useQuery();
  const { data: leadsData } = trpc.leads.list.useQuery({ limit: 200 } as any);
  const leads = (leadsData as any)?.leads ?? [];

  const createMutation = trpc.appointments.create.useMutation({
    onSuccess: () => {
      toast.success("Appointment created");
      setShowCreate(false);
      setNewAppt({ leadId: "", scheduledTime: "", duration: "30", notes: "", timezone: "America/New_York" });
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.appointments.update.useMutation({
    onSuccess: () => { toast.success("Updated"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const apptList = appointments ?? [];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Appointments</h1>
          <p className="text-sm text-muted-foreground mt-1">All scheduled appointments from AI calls and manual bookings</p>
        </div>
        <div className="flex items-center gap-3">
          {GCAL_URL && (
            <a href={GCAL_URL} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="gap-2">
                <ExternalLink className="w-4 h-4" /> Google Calendar
              </Button>
            </a>
          )}
          <Button size="sm" className="gap-2" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" /> New Appointment
          </Button>
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Total", value: stats?.total ?? 0, color: "text-white", icon: Calendar },
          { label: "Upcoming", value: stats?.upcoming ?? 0, color: "text-blue-400", icon: Clock },
          { label: "Showed", value: stats?.showed ?? 0, color: "text-green-400", icon: CheckCircle2 },
          { label: "No Show", value: stats?.noShow ?? 0, color: "text-red-400", icon: XCircle },
          { label: "Show Rate", value: `${stats?.showRate ?? 0}%`, color: "text-purple-400", icon: AlertCircle },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="p-4 rounded-xl bg-card border border-border text-center">
            <Icon className={`w-5 h-5 mx-auto mb-2 ${color}`} />
            <p className={`text-2xl font-black ${color}`}>{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(["upcoming", "all", "completed"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors capitalize ${
              filter === f ? "bg-primary text-white" : "bg-card border border-border text-muted-foreground hover:text-white"
            }`}>
            {f === "all" ? "All Time" : f}
          </button>
        ))}
      </div>

      {/* Appointments list */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading appointments...</div>
      ) : apptList.length === 0 ? (
        <div className="text-center py-16 rounded-xl bg-card border border-border">
          <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-semibold text-white mb-2">No appointments yet</p>
          <p className="text-sm text-muted-foreground mb-6">
            Appointments are booked automatically when the AI detects a prospect agreeing to a time during a call.
            You can also create them manually.
          </p>
          <Button onClick={() => setShowCreate(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Create Manually
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {apptList.map((appt: any) => {
            const scheduled = new Date(appt.scheduledTime);
            const isPast = scheduled < new Date();
            return (
              <div key={appt.id} className="p-5 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    {/* Date block */}
                    <div className="text-center p-3 rounded-lg min-w-[60px]"
                      style={{ backgroundColor: "rgba(29,111,244,0.1)", border: "1px solid rgba(29,111,244,0.2)" }}>
                      <p className="text-xs text-muted-foreground">{scheduled.toLocaleDateString("en-US", { month: "short" })}</p>
                      <p className="text-2xl font-black text-white leading-none">{scheduled.getDate()}</p>
                      <p className="text-xs text-muted-foreground">{scheduled.getFullYear()}</p>
                    </div>

                    <div>
                      {/* Lead info */}
                      <div className="flex items-center gap-2 mb-1">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="font-semibold text-white">
                          {appt.firstName && appt.lastName
                            ? `${appt.firstName} ${appt.lastName}`
                            : `Lead #${appt.leadId}`}
                        </span>
                        {appt.company && <span className="text-xs text-muted-foreground">— {appt.company}</span>}
                      </div>

                      {/* Time + duration */}
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{scheduled.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
                        <span>·</span>
                        <span>{appt.duration ?? 30} min</span>
                        {appt.phone && (
                          <>
                            <span>·</span>
                            <Phone className="w-3.5 h-3.5" />
                            <span>{appt.phone}</span>
                          </>
                        )}
                      </div>

                      {/* Notes */}
                      {appt.notes && (
                        <p className="text-xs text-muted-foreground italic">{appt.notes}</p>
                      )}
                    </div>
                  </div>

                  {/* Status badges + actions */}
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <div className="flex gap-2">
                      <Badge variant="outline" className={STATUS_COLORS[appt.confirmationStatus] ?? ""}>
                        {appt.confirmationStatus}
                      </Badge>
                      <Badge variant="outline" className={SHOW_COLORS[appt.showStatus] ?? ""}>
                        {appt.showStatus?.replace("_", " ")}
                      </Badge>
                    </div>

                    {/* Quick actions */}
                    {isPast && appt.showStatus === "pending" && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateMutation.mutate({ id: appt.id, showStatus: "showed" })}
                          className="text-xs px-2 py-1 rounded text-green-400 hover:bg-green-500/10 transition-colors">
                          ✓ Showed
                        </button>
                        <button
                          onClick={() => updateMutation.mutate({ id: appt.id, showStatus: "no_show" })}
                          className="text-xs px-2 py-1 rounded text-red-400 hover:bg-red-500/10 transition-colors">
                          ✗ No Show
                        </button>
                      </div>
                    )}
                    {!isPast && appt.confirmationStatus === "proposed" && (
                      <button
                        onClick={() => updateMutation.mutate({ id: appt.id, confirmationStatus: "confirmed" })}
                        className="text-xs px-3 py-1 rounded font-medium"
                        style={{ backgroundColor: "rgba(29,111,244,0.15)", color: "#60a5fa" }}>
                        Confirm
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Google Calendar booking link banner */}
      {GCAL_URL && (
        <div className="p-4 rounded-xl flex items-center justify-between"
          style={{ backgroundColor: "rgba(29,111,244,0.08)", border: "1px solid rgba(29,111,244,0.2)" }}>
          <div>
            <p className="text-sm font-semibold text-white">Google Calendar Booking</p>
            <p className="text-xs text-muted-foreground">Share this link with leads to let them self-schedule</p>
          </div>
          <a href={GCAL_URL} target="_blank" rel="noopener noreferrer">
            <Button size="sm" className="gap-2">
              <ExternalLink className="w-4 h-4" /> Open Booking Page
            </Button>
          </a>
        </div>
      )}

      {/* Create appointment dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Appointment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Lead <span className="text-red-400">*</span></Label>
              <Select value={newAppt.leadId} onValueChange={(v) => setNewAppt(a => ({ ...a, leadId: v }))}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue placeholder="Select a lead..." />
                </SelectTrigger>
                <SelectContent>
                  {leads.map((l: any) => (
                    <SelectItem key={l.id} value={String(l.id)}>
                      {l.firstName} {l.lastName} {l.company ? `— ${l.company}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Date & Time <span className="text-red-400">*</span></Label>
              <Input type="datetime-local" className="bg-secondary border-border"
                value={newAppt.scheduledTime}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewAppt(a => ({ ...a, scheduledTime: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Duration (min)</Label>
                <Select value={newAppt.duration} onValueChange={(v) => setNewAppt(a => ({ ...a, duration: v }))}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["15", "30", "45", "60", "90"].map(d => (
                      <SelectItem key={d} value={d}>{d} min</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Timezone</Label>
                <Select value={newAppt.timezone} onValueChange={(v) => setNewAppt(a => ({ ...a, timezone: v }))}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "America/Phoenix"].map(tz => (
                      <SelectItem key={tz} value={tz}>{tz.replace("America/", "")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notes (optional)</Label>
              <Input className="bg-secondary border-border"
                placeholder="Any notes about this appointment..."
                value={newAppt.notes}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewAppt(a => ({ ...a, notes: e.target.value }))} />
            </div>
            <Button className="w-full"
              disabled={!newAppt.leadId || !newAppt.scheduledTime || createMutation.isPending}
              onClick={() => createMutation.mutate({
                leadId: parseInt(newAppt.leadId),
                scheduledTime: new Date(newAppt.scheduledTime).toISOString(),
                duration: parseInt(newAppt.duration),
                notes: newAppt.notes || undefined,
                timezone: newAppt.timezone,
              })}>
              {createMutation.isPending ? "Creating..." : "Create Appointment"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
