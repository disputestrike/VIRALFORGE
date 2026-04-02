import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Plus, Globe, Search, Loader2, Database } from "lucide-react";
import { toast } from "sonner";

export default function KnowledgeBasePage() {
  const [kbName, setKbName] = useState("");
  const [crawlUrl, setCrawlUrl] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedKbId, setSelectedKbId] = useState<number | null>(null);
  const utils = trpc.useUtils();

  // List all knowledge bases
  const { data: kbs, isLoading } = trpc.knowledgeBase.list.useQuery();

  // Create a new knowledge base
  const createKb = trpc.knowledgeBase.create.useMutation({
    onSuccess: (kb: any) => {
      toast.success(`Knowledge base "${kb.name}" created`);
      utils.knowledgeBase.list.invalidate();
      setKbName("");
      setSelectedKbId(kb.id);
    },
    onError: (e) => toast.error(e.message),
  });

  // Add website source to selected KB
  const addWebsite = trpc.knowledgeBase.addWebsiteSource.useMutation({
    onSuccess: () => {
      toast.success("Website queued for crawling — content will be available shortly");
      setCrawlUrl("");
      if (selectedKbId) utils.knowledgeBase.listSources.invalidate({ knowledgeBaseId: selectedKbId });
    },
    onError: (e) => toast.error(e.message),
  });

  // List sources for selected KB
  const { data: sources } = trpc.knowledgeBase.listSources.useQuery(
    { knowledgeBaseId: selectedKbId! },
    { enabled: !!selectedKbId }
  );

  // Stats for selected KB
  const { data: stats } = trpc.knowledgeBase.stats.useQuery(
    { knowledgeBaseId: selectedKbId! },
    { enabled: !!selectedKbId }
  );

  // Search
  const { data: searchResults, refetch: doSearch, isFetching: searching } = trpc.knowledgeBase.search.useQuery(
    { query: searchQuery, knowledgeBaseId: selectedKbId ?? undefined },
    { enabled: false }
  );

  const kbList = (kbs ?? []) as any[];
  const sourceList = (sources ?? []) as any[];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Knowledge Base</h1>
        <p className="text-muted-foreground">Train your AI with your website content. Create a knowledge base, add URLs, and the AI uses it on calls.</p>
      </div>

      {/* Step 1: Create or select KB */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Database className="size-5" /> Your Knowledge Bases</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input placeholder="Name your knowledge base (e.g. 'Company FAQ')" value={kbName} onChange={(e) => setKbName(e.target.value)} />
            <Button onClick={() => createKb.mutate({ name: kbName })} disabled={!kbName.trim() || createKb.isPending}>
              {createKb.isPending ? <Loader2 className="size-4 animate-spin" /> : <><Plus className="size-4 mr-1" /> Create</>}
            </Button>
          </div>
          {kbList.length > 0 && (
            <div className="grid gap-2 md:grid-cols-3">
              {kbList.map((kb: any) => (
                <button key={kb.id} onClick={() => setSelectedKbId(kb.id)}
                  className={`text-left p-3 rounded-lg border transition-all ${selectedKbId === kb.id ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}>
                  <p className="font-medium text-sm">{kb.name}</p>
                  <p className="text-xs text-muted-foreground">{kb.status} · {kb.description || "No description"}</p>
                </button>
              ))}
            </div>
          )}
          {isLoading && <div className="flex justify-center py-4"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>}
          {!isLoading && kbList.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No knowledge bases yet. Create one above to get started.</p>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Add sources (only if KB selected) */}
      {selectedKbId && (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Globe className="size-4" /> Add Website URL</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">Enter a URL and we'll crawl the page content.</p>
                <div className="flex gap-2">
                  <Input placeholder="https://yourwebsite.com/about" value={crawlUrl} onChange={(e) => setCrawlUrl(e.target.value)} />
                  <Button onClick={() => addWebsite.mutate({ knowledgeBaseId: selectedKbId, url: crawlUrl })} disabled={!crawlUrl || addWebsite.isPending}>
                    {addWebsite.isPending ? <Loader2 className="size-4 animate-spin" /> : "Crawl"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Search className="size-4" /> Test Search</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">Test what your AI knows from this knowledge base.</p>
                <div className="flex gap-2">
                  <Input placeholder="Ask a question..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                  <Button onClick={() => doSearch()} disabled={!searchQuery || searching}>
                    {searching ? <Loader2 className="size-4 animate-spin" /> : "Search"}
                  </Button>
                </div>
                {searchResults && (
                  <div className="rounded-lg border p-3 text-sm bg-muted/50 max-h-40 overflow-y-auto">
                    {(searchResults as any[]).length > 0
                      ? (searchResults as any[]).map((r: any, i: number) => <p key={i} className="mb-2 text-xs">{r.content?.slice(0, 200)}...</p>)
                      : <p className="text-muted-foreground">No results. Add more content first.</p>
                    }
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg border p-4 text-center">
                <p className="text-2xl font-bold">{(stats as any).sources}</p>
                <p className="text-xs text-muted-foreground">Sources</p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <p className="text-2xl font-bold">{(stats as any).chunks}</p>
                <p className="text-xs text-muted-foreground">Chunks</p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <p className="text-2xl font-bold">{(stats as any).pending}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
          )}

          {/* Sources list */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><BookOpen className="size-5" /> Sources ({sourceList.length})</CardTitle></CardHeader>
            <CardContent>
              {sourceList.length > 0 ? (
                <div className="space-y-2">
                  {sourceList.map((s: any) => (
                    <div key={s.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex items-center gap-3">
                        <Globe className="size-4 text-blue-500" />
                        <div>
                          <p className="text-sm font-medium">{s.sourceUrl || "Untitled"}</p>
                          <p className="text-xs text-muted-foreground">{s.sourceType} · {s.status} · {s.chunkCount ?? 0} chunks</p>
                        </div>
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.status === "completed" ? "bg-green-100 text-green-700" : s.status === "failed" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                        {s.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-6 text-muted-foreground">No sources yet. Add a website URL above.</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
