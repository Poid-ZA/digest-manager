import { useEffect, useMemo, useState } from "react";
import { useDigest } from "@/context/DigestContext";
import { buildDigestFeedXml, DigestFeedItem } from "@/lib/digest-feed";
import { TopicBadge } from "@/components/TopicBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Copy, ExternalLink, FileText, RefreshCw, Rss } from "lucide-react";
import { format } from "date-fns";
import { DigestRun } from "@/lib/digest-types";

function parseDigestPreview(runId: string, preview: string, publishedAt: string): DigestFeedItem[] {
  const lines = preview.split("\n").map((line) => line.trim());
  const items: DigestFeedItem[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.startsWith("[") || !line.includes("]")) {
      index += 1;
      continue;
    }

    const closeIndex = line.indexOf("]");
    const topic = line.slice(1, closeIndex).trim();
    const title = line.slice(closeIndex + 1).trim();
    const summary = lines[index + 1] ?? "";
    const url = lines[index + 2] ?? "";

    if (title && url.startsWith("http")) {
      items.push({
        id: `${runId}-${items.length + 1}`,
        topic,
        title,
        summary,
        url,
        publishedAt,
        feedName: "Curated digest item",
      });
      index += 3;
      continue;
    }

    index += 1;
  }

  return items;
}

export default function DigestFeedPage() {
  const { runs, articles, triggerRun, refreshing, loading } = useDigest();
  const { toast } = useToast();
  const [latestGeneratedRun, setLatestGeneratedRun] = useState<DigestRun | null>(null);

  const latestPersistedRun = useMemo(
    () => [...runs].sort((left, right) => Date.parse(right.date) - Date.parse(left.date))[0] ?? null,
    [runs],
  );

  useEffect(() => {
    if (!latestGeneratedRun || !latestPersistedRun) {
      return;
    }
    if (Date.parse(latestPersistedRun.date) >= Date.parse(latestGeneratedRun.date)) {
      setLatestGeneratedRun(null);
    }
  }, [latestGeneratedRun, latestPersistedRun]);

  const latestRun = latestGeneratedRun ?? latestPersistedRun;

  const selectedArticles = useMemo<DigestFeedItem[]>(() => {
    if (!latestRun) {
      return [];
    }
    const selectedIds = new Set(latestRun.selectedArticleIds);
    return articles.filter((article) => selectedIds.has(article.id));
  }, [articles, latestRun]);

  const previewFallbackItems = useMemo(
    () => (latestRun ? parseDigestPreview(latestRun.id, latestRun.preview, latestRun.date) : []),
    [latestRun],
  );

  const displayItems = selectedArticles.length > 0 ? selectedArticles : previewFallbackItems;
  const usingPreviewFallback = selectedArticles.length === 0 && previewFallbackItems.length > 0;

  const xml = useMemo(() => buildDigestFeedXml(latestRun, displayItems), [latestRun, displayItems]);

  const handleCopyXml = async () => {
    await navigator.clipboard.writeText(xml);
    toast({ title: "Feed XML copied", description: "The latest digest RSS XML is now on your clipboard." });
  };

  const handleOpenXml = () => {
    const blob = new Blob([xml], { type: "application/rss+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  };

  const handleGenerate = async () => {
    const digest = await triggerRun();
    setLatestGeneratedRun(digest.run);
    toast({
      title: "Digest feed refreshed",
      description: `${digest.run.includedArticles} articles published into the latest digest feed.`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Digest Feed</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading ? "Loading latest digest feed..." : "Review the latest digest as both a rendered list and RSS XML"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCopyXml} disabled={!latestRun}>
            <Copy className="mr-1 h-4 w-4" /> Copy XML
          </Button>
          <Button variant="outline" onClick={handleOpenXml} disabled={!latestRun}>
            <ExternalLink className="mr-1 h-4 w-4" /> Open XML
          </Button>
          <Button onClick={handleGenerate} disabled={refreshing}>
            <RefreshCw className="mr-1 h-4 w-4" /> Refresh Feed
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Rss className="h-4 w-4" />
              Latest Digest
            </CardTitle>
            <CardDescription>
              {latestRun
                ? `${displayItems.length} curated articles from ${format(new Date(latestRun.date), "MMM d, yyyy HH:mm")}`
                : "Run a digest to populate the feed."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {usingPreviewFallback && (
              <div className="rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
                Showing the curated digest directly from the stored run preview while article persistence catches up.
              </div>
            )}
            {latestRun ? (
              displayItems.map((article) => (
                <div key={article.id} className="rounded-md border bg-background p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <TopicBadge topic={article.topic} />
                    <Badge variant="secondary" className="text-xs font-mono">
                      {article.feedName ?? "Curated digest item"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(article.publishedAt ?? latestRun.date), "MMM d, HH:mm")}
                    </span>
                  </div>
                  <h3 className="mt-2 text-sm font-medium">{article.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{article.summary}</p>
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    Open source <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              ))
            ) : (
              <div className="rounded-md bg-background p-3 text-sm text-muted-foreground">
                No digest feed has been generated yet.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              RSS XML
            </CardTitle>
            <CardDescription>Portable feed output for readers, automation, or export.</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="max-h-[36rem] overflow-auto rounded-md bg-background p-3 text-xs leading-relaxed text-muted-foreground">
              {latestRun ? xml : "Generate a digest run to produce RSS XML."}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
