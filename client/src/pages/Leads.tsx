import { useMemo, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  Bot, Building2, CheckCircle2, Cloud, FileSpreadsheet, Mail, Phone, Plus, Search,
  Shield, Trash2, Upload, User, XCircle, AlertCircle, ArrowRight,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import * as XLSX from "xlsx";

const segmentBadge = (s: string) => {
  const map: Record<string, string> = {
    hot: "apex-badge-hot",
    warm: "apex-badge-warm",
    cold: "apex-badge-cold",
    unqualified: "apex-badge-unverified",
  };
  return map[s] ?? "apex-badge-unverified";
};

const verifyBadge = (s: string) => {
  const map: Record<string, string> = {
    verified: "apex-badge-verified",
    unverified: "apex-badge-unverified",
    bounced: "text-red-400 bg-red-500/10 border-red-500/30 text-xs px-2 py-0.5 rounded-full border font-medium",
    pending: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30 text-xs px-2 py-0.5 rounded-full border font-medium",
  };
  return map[s] ?? "apex-badge-unverified";
};

type LeadRow = Record<string, string>;
type ColumnMap = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  industry: string;
  title: string;
};

const LEAD_FIELDS: { key: keyof ColumnMap; label: string; required?: boolean }[] = [
  { key: "firstName", label: "First Name", required: true },
  { key: "lastName", label: "Last Name", required: true },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "company", label: "Company" },
  { key: "industry", label: "Industry" },
  { key: "title", label: "Job Title" },
];

function autoDetectColumns(headers: string[]): Partial<ColumnMap> {
  const lower = headers.map((h) => h.toLowerCase().trim());
  const find = (patterns: string[]) => {
    const idx = lower.findIndex((h) => patterns.some((p) => h.includes(p)));
    return idx >= 0 ? headers[idx] : "";
  };
  return {
    firstName: find(["first name", "firstname", "first", "fname", "given"]),
    lastName: find(["last name", "lastname", "last", "lname", "surname", "family"]),
    email: find(["email", "e-mail", "mail"]),
    phone: find(["phone", "mobile", "cell", "tel", "number"]),
    company: find(["company", "organization", "org", "employer", "business"]),
    industry: find(["industry", "sector", "vertical", "niche"]),
    title: find(["title", "position", "role", "job", "designation"]),
  };
}

export default function Leads() {
  const [search, setSearch] = useState("");
  const [aiQuery, setAiQuery] = useState("");
  const [segment, setSegment] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", phone: "",
    company: "", industry: "", title: "", linkedinUrl: "", notes: "",
  });

  // Import state
  const [showImport, setShowImport] = useState(false);
  const [importStep, setImportStep] = useState<"upload" | "map" | "preview" | "done">("upload");
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [importRows, setImportRows] = useState<LeadRow[]>([]);
  const [columnMap, setColumnMap] = useState<Partial<ColumnMap>>({});
  const [importResult, setImportResult] = useState<{ created: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();
  const { data: workspaceHealth } = trpc.settings.workspaceHealth.useQuery();
  const { data, isLoading } = trpc.leads.list.useQuery({
    search: search || undefined,
    segment: segment && segment !== "all" ? segment : undefined,
    status: status && status !== "all" ? status : undefined,
    limit: 50,
  });
  const createMutation = trpc.leads.create.useMutation({
    onSuccess: () => {
      utils.leads.list.invalidate();
      setShowCreate(false);
      setForm({ firstName: "", lastName: "", email: "", phone: "", company: "", industry: "", title: "", linkedinUrl: "", notes: "" });
      toast.success("Lead created");
    },
    onError: (e) => {
      toast.error(e.message || "Failed to create lead");
      console.error("[Lead Create Error]", e);
    },
  });
  const deleteMutation = trpc.leads.delete.useMutation({
    onSuccess: () => { utils.leads.list.invalidate(); toast.success("Lead deleted"); },
  });
  const verifyMutation = trpc.leads.verify.useMutation({
    onSuccess: (d) => { utils.leads.list.invalidate(); toast.success(`Verification: ${d.status}`); },
  });
  const aiSearchMutation = trpc.leads.aiSearch.useMutation({
    onSuccess: (d) => {
      if (d.llmParsed) toast.success(`Found ${d.leads.length} leads (AI filters applied)`);
      else
        toast.message(`Found ${d.leads.length} leads`, {
          description:
            "Searched your text in names, email, and company. Enable workspace AI for natural-language filters.",
        });
    },
    onError: (e) => toast.error(e.message || "Search failed"),
  });
  const importMutation = trpc.leads.importBulk.useMutation({
    onSuccess: (d) => {
      utils.leads.list.invalidate();
      setImportResult(d);
      setImportStep("done");
      toast.success(`Imported ${d.created} leads successfully`);
    },
    onError: (e) => toast.error(e.message),
  });

  const { data: crmConnections } = trpc.crm.list.useQuery();
  const crmSyncLead = trpc.crm.syncLead.useMutation({
    onSuccess: (d) => toast.success(`Synced to ${d.provider} (record ${d.externalId})`),
    onError: (e) => toast.error(e.message || "CRM sync failed"),
  });

  const handleAiSearch = () => {
    if (!aiQuery.trim()) return;
    aiSearchMutation.mutate({ query: aiQuery });
  };

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json: LeadRow[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        if (!json.length) { toast.error("File is empty or unreadable"); return; }
        const headers = Object.keys(json[0]);
        setImportHeaders(headers);
        setImportRows(json.slice(0, 500)); // max 500 rows
        setColumnMap(autoDetectColumns(headers));
        setImportStep("map");
      } catch {
        toast.error("Could not parse file. Please upload a valid Excel (.xlsx) or CSV file.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const mappedLeads = useMemo(() => importRows.map((row) => ({
    firstName: String(row[columnMap.firstName ?? ""] ?? "").trim(),
    lastName: String(row[columnMap.lastName ?? ""] ?? "").trim(),
    email: String(row[columnMap.email ?? ""] ?? "").trim() || undefined,
    phone: String(row[columnMap.phone ?? ""] ?? "").trim() || undefined,
    company: String(row[columnMap.company ?? ""] ?? "").trim() || undefined,
    industry: String(row[columnMap.industry ?? ""] ?? "").trim() || undefined,
    title: String(row[columnMap.title ?? ""] ?? "").trim() || undefined,
  })).filter((l) => l.firstName && l.lastName), [importRows, columnMap]);

  const handleImport = () => importMutation.mutate(mappedLeads);

  const resetImport = () => {
    setImportStep("upload");
    setImportHeaders([]);
    setImportRows([]);
    setColumnMap({});
    setImportResult(null);
  };

  const displayLeads = aiSearchMutation.data?.leads ?? data?.leads ?? [];
  const total = aiSearchMutation.data?.total ?? data?.total ?? 0;

  return (
    <div className="p-6 space-y-5">
      {workspaceHealth && !workspaceHealth.database && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Database not connected</AlertTitle>
          <AlertDescription>
            Leads and campaigns cannot load until <code className="text-xs">DATABASE_URL</code> is set and reachable on the server.
          </AlertDescription>
        </Alert>
      )}
      {workspaceHealth?.database && !workspaceHealth.llm && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Limited AI features</AlertTitle>
          <AlertDescription>
            Natural-language lead search falls back to plain text search until AI is configured. Script and template generation need the same setup.
          </AlertDescription>
        </Alert>
      )}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Lead Management</h1>
          <p className="text-muted-foreground text-sm mt-1">{total} total leads · AI-powered search and verification</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { resetImport(); setShowImport(true); }}>
            <Upload className="w-4 h-4 mr-2" /> Import Excel / CSV
          </Button>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-2" /> Add Lead
          </Button>
        </div>
      </div>

      {/* AI Search */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Bot className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
              <Input
                className="pl-9 bg-secondary border-border"
                placeholder='Ask in plain English: "Show me hot leads in solar industry with verified emails"'
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAiSearch()}
              />
            </div>
            <Button onClick={handleAiSearch} disabled={aiSearchMutation.isPending} className="px-5">
              {aiSearchMutation.isPending ? "Searching..." : "AI Search"}
            </Button>
            {aiSearchMutation.data && (
              <Button variant="outline" size="sm" onClick={() => aiSearchMutation.reset()}>Clear</Button>
            )}
          </div>
          {aiSearchMutation.data?.filters && (
            <div className="mt-2 flex gap-2 flex-wrap">
              {Object.entries(aiSearchMutation.data.filters).filter(([, v]) => v).map(([k, v]) => (
                <Badge key={k} variant="outline" className="text-xs text-primary border-primary/30 bg-primary/5">
                  {k}: {v as string}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9 bg-secondary border-border" placeholder="Search leads..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={segment} onValueChange={setSegment}>
          <SelectTrigger className="w-36 bg-secondary border-border">
            <SelectValue placeholder="Segment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Segments</SelectItem>
            <SelectItem value="hot">Hot</SelectItem>
            <SelectItem value="warm">Warm</SelectItem>
            <SelectItem value="cold">Cold</SelectItem>
            <SelectItem value="unqualified">Unqualified</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-36 bg-secondary border-border">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="qualified">Qualified</SelectItem>
            <SelectItem value="converted">Converted</SelectItem>
            <SelectItem value="lost">Lost</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Leads table */}
      <Card className="bg-card border-border">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">Loading leads...</div>
          ) : displayLeads.length === 0 ? (
            <div className="py-12 text-center">
              <User className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
              <p className="text-muted-foreground text-sm">No leads found. Add your first lead or import from Excel/CSV.</p>
              <div className="flex gap-2 justify-center mt-4">
                <Button size="sm" variant="outline" onClick={() => { resetImport(); setShowImport(true); }}>
                  <Upload className="w-4 h-4 mr-2" /> Import
                </Button>
                <Button size="sm" onClick={() => setShowCreate(true)}>Add Lead</Button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">Name</th>
                    <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium hidden md:table-cell">Company</th>
                    <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium hidden lg:table-cell">Contact</th>
                    <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">Score</th>
                    <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">Segment</th>
                    <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium hidden sm:table-cell">Verified</th>
                    <th className="text-right px-4 py-3 text-xs text-muted-foreground font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayLeads.map((lead) => (
                    <tr key={lead.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-semibold text-primary">{lead.firstName[0]}{lead.lastName[0]}</span>
                          </div>
                          <div>
                            <p className="font-medium">{lead.firstName} {lead.lastName}</p>
                            {lead.title && <p className="text-xs text-muted-foreground">{lead.title}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-muted-foreground">{lead.company ?? "—"}</span>
                        </div>
                        {lead.industry && <p className="text-xs text-muted-foreground mt-0.5">{lead.industry}</p>}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="space-y-0.5">
                          {lead.email && <div className="flex items-center gap-1 text-xs text-muted-foreground"><Mail className="w-3 h-3" />{lead.email}</div>}
                          {lead.phone && <div className="flex items-center gap-1 text-xs text-muted-foreground"><Phone className="w-3 h-3" />{lead.phone}</div>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${lead.score ?? 0}%` }} />
                          </div>
                          <span className="text-xs font-medium">{lead.score ?? 0}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={segmentBadge(lead.segment ?? "cold")}>{lead.segment ?? "cold"}</span>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className={verifyBadge(lead.verificationStatus ?? "unverified")}>{lead.verificationStatus ?? "unverified"}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
                                title="Push to CRM"
                                type="button"
                              >
                                <Cloud className="w-3.5 h-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-card border-border">
                              {(["hubspot", "salesforce", "pipedrive"] as const).map((prov) => {
                                const conn = crmConnections?.find((c) => c.provider === prov);
                                const connected = conn?.status === "connected";
                                const label =
                                  prov === "hubspot"
                                    ? "HubSpot"
                                    : prov === "salesforce"
                                      ? "Salesforce"
                                      : "Pipedrive";
                                return (
                                  <DropdownMenuItem
                                    key={prov}
                                    className="text-sm"
                                    disabled={!connected || crmSyncLead.isPending}
                                    onClick={() => crmSyncLead.mutate({ provider: prov, leadId: lead.id })}
                                  >
                                    {label}
                                    {!connected ? " — connect in Settings" : ""}
                                  </DropdownMenuItem>
                                );
                              })}
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-primary" onClick={() => verifyMutation.mutate({ id: lead.id })} title="Verify">
                            <Shield className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => deleteMutation.mutate({ id: lead.id })} title="Delete">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Import Dialog ──────────────────────────────────────────────────────── */}
      <Dialog open={showImport} onOpenChange={(o) => { if (!o) resetImport(); setShowImport(o); }}>
        <DialogContent className="max-w-2xl bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-primary" /> Import Leads from Excel / CSV
            </DialogTitle>
          </DialogHeader>

          {/* Step: Upload */}
          {importStep === "upload" && (
            <div className="space-y-4">
              <div
                className="border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="font-medium text-sm">Drop your Excel or CSV file here</p>
                <p className="text-xs text-muted-foreground mt-1">or click to browse · .xlsx, .xls, .csv supported · max 500 rows</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }}
                />
              </div>
              <div className="p-3 rounded-lg bg-secondary/50 text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">Expected columns (any order, any name):</p>
                <p>First Name, Last Name, Email, Phone, Company, Industry, Job Title</p>
                <p>Column names are auto-detected — you can remap them in the next step.</p>
              </div>
            </div>
          )}

          {/* Step: Map Columns */}
          {importStep === "map" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{importRows.length}</span> rows detected.
                  Map your file's columns to lead fields below.
                </p>
                <Badge variant="outline" className="text-xs">{importHeaders.length} columns found</Badge>
              </div>

              <div className="space-y-3">
                {LEAD_FIELDS.map(({ key, label, required }) => (
                  <div key={key} className="flex items-center gap-3">
                    <div className="w-28 text-xs font-medium flex-shrink-0">
                      {label} {required && <span className="text-red-400">*</span>}
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <Select
                      value={columnMap[key] ?? "none"}
                      onValueChange={(v) => setColumnMap((m) => ({ ...m, [key]: v === "none" ? "" : v }))}
                    >
                      <SelectTrigger className="bg-secondary border-border flex-1">
                        <SelectValue placeholder="Select column..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— Not mapped —</SelectItem>
                        {importHeaders.map((h) => (
                          <SelectItem key={h} value={h}>{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {columnMap[key] && (
                      <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>

              {(!columnMap.firstName || !columnMap.lastName) && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  First Name and Last Name columns must be mapped to proceed.
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={resetImport}>Back</Button>
                <Button
                  className="flex-1"
                  disabled={!columnMap.firstName || !columnMap.lastName}
                  onClick={() => setImportStep("preview")}
                >
                  Preview {importRows.length} Rows
                </Button>
              </div>
            </div>
          )}

          {/* Step: Preview */}
          {importStep === "preview" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{mappedLeads.length}</span> valid leads ready to import
                  {importRows.length - mappedLeads.length > 0 && (
                    <span className="text-yellow-400 ml-2">· {importRows.length - mappedLeads.length} rows skipped (missing name)</span>
                  )}
                </p>
              </div>

              <div className="rounded-lg border border-border overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-secondary sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2 text-muted-foreground font-medium">Name</th>
                      <th className="text-left px-3 py-2 text-muted-foreground font-medium">Email</th>
                      <th className="text-left px-3 py-2 text-muted-foreground font-medium">Phone</th>
                      <th className="text-left px-3 py-2 text-muted-foreground font-medium">Company</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mappedLeads.slice(0, 20).map((l, i) => (
                      <tr key={`${i}-${l.firstName}-${l.lastName}-${l.email ?? ""}`} className="border-t border-border/50">
                        <td className="px-3 py-2">{l.firstName} {l.lastName}</td>
                        <td className="px-3 py-2 text-muted-foreground">{l.email ?? "—"}</td>
                        <td className="px-3 py-2 text-muted-foreground">{l.phone ?? "—"}</td>
                        <td className="px-3 py-2 text-muted-foreground">{l.company ?? "—"}</td>
                      </tr>
                    ))}
                    {mappedLeads.length > 20 && (
                      <tr className="border-t border-border/50">
                        <td colSpan={4} className="px-3 py-2 text-center text-muted-foreground">
                          ... and {mappedLeads.length - 20} more rows
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setImportStep("map")}>Back</Button>
                <Button
                  className="flex-1"
                  disabled={!mappedLeads.length || importMutation.isPending}
                  onClick={handleImport}
                >
                  {importMutation.isPending ? "Importing..." : `Import ${mappedLeads.length} Leads`}
                </Button>
              </div>
            </div>
          )}

          {/* Step: Done */}
          {importStep === "done" && importResult && (
            <div className="text-center py-6 space-y-4">
              <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7 text-green-400" />
              </div>
              <div>
                <p className="text-lg font-bold">{importResult.created} Leads Imported</p>
                <p className="text-sm text-muted-foreground mt-1">
                  All leads have been scored and segmented automatically.
                </p>
              </div>
              <Button onClick={() => { setShowImport(false); resetImport(); }}>
                View Leads
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Lead Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle>Add New Lead</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">First Name *</Label>
              <Input className="bg-secondary border-border" value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Last Name *</Label>
              <Input className="bg-secondary border-border" value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email</Label>
              <Input className="bg-secondary border-border" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Phone</Label>
              <Input className="bg-secondary border-border" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Company</Label>
              <Input className="bg-secondary border-border" value={form.company} onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Industry</Label>
              <Input className="bg-secondary border-border" value={form.industry} onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Title</Label>
              <Input className="bg-secondary border-border" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">LinkedIn URL</Label>
              <Input className="bg-secondary border-border" value={form.linkedinUrl} onChange={(e) => setForm((f) => ({ ...f, linkedinUrl: e.target.value }))} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Input className="bg-secondary border-border" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button
              disabled={!form.firstName || !form.lastName || createMutation.isPending}
              onClick={() => createMutation.mutate({
                ...form,
                email: form.email || undefined,
                phone: form.phone || undefined,
                company: form.company || undefined,
                industry: form.industry || undefined,
                title: form.title || undefined,
                linkedinUrl: form.linkedinUrl || undefined,
                notes: form.notes || undefined,
              })}
            >
              {createMutation.isPending ? "Creating..." : "Create Lead"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
