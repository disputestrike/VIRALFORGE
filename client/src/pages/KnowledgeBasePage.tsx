import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Plus, Globe, FileText, Search, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function KnowledgeBase() {
  const [crawlUrl, setCrawlUrl] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const utils = trpc.useUtils();
  const { data: sources, isLoading } = trpc.knowledgeBase.list.useQuery();
  const crawlMutation = trpc.knowledgeBase.crawlUrl.useMutation({
    onSuccess: () => { toast.success("Website crawled successfully"); utils.knowledgeBase.list.invalidate(); setCrawlUrl(""); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.knowledgeBase.deleteSource.useMutation({
    onSuccess: () => { toast.success("Source deleted"); utils.knowledgeBase.list.invalidate(); },
  });
  const searchMutation = trpc.knowledgeBase.semanticSearch.useMutation();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Knowledge Base</h1>
        <p className="text-muted-foreground">Train your AI with your website content, documents, and FAQs. The AI uses this to answer questions accurately on calls.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Globe className="size-5" /> Crawl Website</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Enter a URL and we'll crawl the page content to train your AI.</p>
            <div className="flex gap-2">
              <Input placeholder="https://yourwebsite.com" value={crawlUrl} onChange={(e) => setCrawlUrl(e.target.value)} />
              <Button onClick={() => crawlMutation.mutate({ url: crawlUrl })} disabled={!crawlUrl || crawlMutation.isPending}>
                {crawlMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Search className="size-5" /> Test Search</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Test what your AI knows by searching your knowledge base.</p>
            <div className="flex gap-2">
              <Input placeholder="Ask a question..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              <Button onClick={() => searchMutation.mutate({ query: searchQuery })} disabled={!searchQuery || searchMutation.isPending}>
                {searchMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
              </Button>
            </div>
            {searchMutation.data && (
              <div className="rounded-lg border p-3 text-sm bg-muted/50">
                {(searchMutation.data as any[]).length > 0
                  ? (searchMutation.data as any[]).map((r: any, i: number) => <p key={i} className="mb-1">{r.content?.slice(0, 200)}...</p>)
                  : <p className="text-muted-foreground">No results found. Add more content to your knowledge base.</p>
                }
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><BookOpen className="size-5" /> Sources ({(sources as any[])?.length ?? 0})</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
          ) : (sources as any[])?.length ? (
            <div className="space-y-2">
              {(sources as any[]).map((s: any) => (
                <div key={s.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    {s.sourceType === "url" ? <Globe className="size-4 text-blue-500" /> : <FileText className="size-4 text-orange-500" />}
                    <div>
                      <p className="text-sm font-medium">{s.title || s.sourceUrl || "Untitled"}</p>
                      <p className="text-xs text-muted-foreground">{s.sourceType} · {s.chunkCount ?? 0} chunks</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate({ id: s.id })}><Trash2 className="size-4 text-red-500" /></Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <BookOpen className="size-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">No sources yet. Crawl a website or upload a document to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
