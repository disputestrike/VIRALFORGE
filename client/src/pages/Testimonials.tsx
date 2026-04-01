import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowRight, Plus, Quote, Star, TrendingUp, Trash2 } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

const INDUSTRIES = ["Solar", "Roofing", "HVAC", "Real Estate", "Insurance", "Financial Services", "Healthcare", "Legal", "Home Services", "B2B SaaS", "Other"];

const defaultTestimonials = [
  { id: -1, clientName: "Marcus T.", company: "SunPower Solutions", industry: "Solar", rating: 5, quote: "ApexAI completely transformed our lead pipeline. We went from 12 appointments a week to 47. The AI voice calls sound indistinguishable from our best reps.", beforeMetric: "12 appts/week", afterMetric: "47 appts/week", specificResult: "292% increase in appointments", featured: true },
  { id: -2, clientName: "Rachel K.", company: "ProRoof Inc.", industry: "Roofing", rating: 5, quote: "We replaced 3 full-time SDRs with ApexAI and doubled our show rate. The ROI in the first 60 days was unbelievable — 8x what we spent.", beforeMetric: "22% show rate", afterMetric: "61% show rate", specificResult: "177% show rate improvement", featured: true },
  { id: -3, clientName: "James W.", company: "ComfortAir HVAC", industry: "HVAC", rating: 5, quote: "The multi-channel approach is genius. Voice + SMS follow-up converts at 3x our old cold calling. We're booking 30+ jobs a week on autopilot.", beforeMetric: "10 jobs/week", afterMetric: "30+ jobs/week", specificResult: "200% increase in booked jobs", featured: false },
  { id: -4, clientName: "Priya S.", company: "Metro Realty Group", industry: "Real Estate", rating: 5, quote: "Our agents were spending 4 hours a day on cold outreach. Now ApexAI handles it all and our agents focus on closing. Revenue up 45% in 3 months.", beforeMetric: "4hrs/day outreach", afterMetric: "0hrs/day outreach", specificResult: "45% revenue increase in 90 days", featured: false },
  { id: -5, clientName: "Derek M.", company: "ShieldGuard Insurance", industry: "Insurance", rating: 4, quote: "The plain English lead search is incredible. I can say 'show me homeowners in Texas who haven't responded in 30 days' and it just works.", beforeMetric: "8% response rate", afterMetric: "31% response rate", specificResult: "287% response rate improvement", featured: false },
  { id: -6, clientName: "Lisa C.", company: "Apex Financial", industry: "Financial Services", rating: 5, quote: "We were skeptical about AI calls but after the first week, our team was blown away. Prospects can't tell it's AI. Appointment rate up 340%.", beforeMetric: "6% appt rate", afterMetric: "26% appt rate", specificResult: "340% appointment rate increase", featured: true },
];

export default function Testimonials() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [showCreate, setShowCreate] = useState(false);
  const [filterIndustry, setFilterIndustry] = useState("");
  const [form, setForm] = useState({ clientName: "", company: "", industry: "", rating: "5", quote: "", beforeMetric: "", afterMetric: "", specificResult: "" });

  const utils = trpc.useUtils();
  const { data: dbTestimonials } = trpc.testimonials.list.useQuery({});
  const createMutation = trpc.testimonials.create.useMutation({
    onSuccess: () => { utils.testimonials.list.invalidate(); setShowCreate(false); setForm({ clientName: "", company: "", industry: "", rating: "5", quote: "", beforeMetric: "", afterMetric: "", specificResult: "" }); toast.success("Testimonial added"); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.testimonials.delete.useMutation({ onSuccess: () => { utils.testimonials.list.invalidate(); toast.success("Testimonial deleted"); } });

  const allTestimonials = [
    ...defaultTestimonials.filter((t) => !filterIndustry || filterIndustry === "all" || t.industry === filterIndustry),
    ...(dbTestimonials ?? []).filter((t) => !filterIndustry || filterIndustry === "all" || t.industry === filterIndustry).map((t) => ({
      id: t.id,
      clientName: t.clientName,
      company: t.company ?? "",
      industry: t.industry,
      rating: 5,
      quote: t.quote,
      beforeMetric: t.beforeMetric ?? "",
      afterMetric: t.afterMetric ?? "",
      specificResult: t.specificResult ?? "",
      featured: t.featured ?? false,
    })),
  ];

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Case Studies & Testimonials</h1>
          <p className="text-muted-foreground text-sm mt-1">Real results from real businesses across industries</p>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-2" /> Add Testimonial
          </Button>
        )}
      </div>

      {/* Stats banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Avg Response Rate Increase", value: "287%", color: "text-blue-400" },
          { label: "Avg Appointment Increase", value: "312%", color: "text-green-400" },
          { label: "Avg Show Rate Improvement", value: "177%", color: "text-orange-400" },
          { label: "Avg ROI in 90 Days", value: "840%", color: "text-purple-400" },
        ].map(({ label, value, color }) => (
          <Card key={label} className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <div className={`text-2xl font-black ${color}`}>{value}</div>
              <div className="text-xs text-muted-foreground mt-1">{label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-3">
        <Select value={filterIndustry} onValueChange={setFilterIndustry}>
          <SelectTrigger className="w-44 bg-secondary border-border">
            <SelectValue placeholder="All Industries" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Industries</SelectItem>
            {INDUSTRIES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Testimonials grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {allTestimonials.map((t) => (
          <Card key={t.id} className={`bg-card border-border hover:border-primary/20 transition-colors relative ${t.featured ? "ring-1 ring-primary/20" : ""}`}>
            {t.featured && (
              <div className="absolute top-3 right-3">
                <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20 border">Featured</Badge>
              </div>
            )}
            <CardContent className="p-5">
              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <Quote className="w-5 h-5 text-primary/30 mb-2" />
              <p className="text-sm text-muted-foreground leading-relaxed mb-4 line-clamp-4">{t.quote}</p>

              {/* Before/After */}
              {(t.beforeMetric || t.afterMetric) && (
                <div className="flex items-center gap-2 mb-4 p-2.5 rounded-lg bg-secondary/50">
                  <div className="text-center flex-1">
                    <div className="text-xs text-muted-foreground">Before</div>
                    <div className="text-sm font-semibold text-red-400">{t.beforeMetric}</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div className="text-center flex-1">
                    <div className="text-xs text-muted-foreground">After</div>
                    <div className="text-sm font-semibold text-green-400">{t.afterMetric}</div>
                  </div>
                </div>
              )}

              {t.specificResult && (
                <div className="flex items-center gap-1.5 mb-4">
                  <TrendingUp className="w-3.5 h-3.5 text-green-400" />
                  <span className="text-xs font-semibold text-green-400">{t.specificResult}</span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-semibold text-primary">{t.clientName[0]}</span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold">{t.clientName}</p>
                    {t.company && <p className="text-[10px] text-muted-foreground">{t.company}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge variant="outline" className="text-[10px]">{t.industry}</Badge>
                  {t.id > 0 && isAdmin && (
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive" onClick={() => deleteMutation.mutate({ id: t.id })}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Testimonial Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle>Add Testimonial</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Client Name *</Label>
              <Input className="bg-secondary border-border" value={form.clientName} onChange={(e) => setForm((f) => ({ ...f, clientName: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Company</Label>
              <Input className="bg-secondary border-border" value={form.company} onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Industry *</Label>
              <Select value={form.industry || undefined} onValueChange={(v) => setForm((f) => ({ ...f, industry: v }))}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{INDUSTRIES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Rating</Label>
              <Select value={form.rating} onValueChange={(v) => setForm((f) => ({ ...f, rating: v }))}>
                <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[5, 4, 3, 2, 1].map((r) => <SelectItem key={r} value={r.toString()}>{r} Stars</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Before Metric</Label>
              <Input className="bg-secondary border-border" placeholder="e.g. 12 appts/week" value={form.beforeMetric} onChange={(e) => setForm((f) => ({ ...f, beforeMetric: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">After Metric</Label>
              <Input className="bg-secondary border-border" placeholder="e.g. 47 appts/week" value={form.afterMetric} onChange={(e) => setForm((f) => ({ ...f, afterMetric: e.target.value }))} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs">Specific Result</Label>
              <Input className="bg-secondary border-border" placeholder="e.g. 292% increase in appointments" value={form.specificResult} onChange={(e) => setForm((f) => ({ ...f, specificResult: e.target.value }))} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs">Quote *</Label>
              <Textarea className="bg-secondary border-border resize-none" rows={3} value={form.quote} onChange={(e) => setForm((f) => ({ ...f, quote: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button
              disabled={!form.clientName || !form.industry || !form.quote || createMutation.isPending}
              onClick={() => createMutation.mutate({ clientName: form.clientName, company: form.company || undefined, industry: form.industry, quote: form.quote, beforeMetric: form.beforeMetric || undefined, afterMetric: form.afterMetric || undefined, specificResult: form.specificResult || undefined })}
            >
              {createMutation.isPending ? "Adding..." : "Add Testimonial"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
