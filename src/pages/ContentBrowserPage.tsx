import { useMemo, useState } from "react";
import { TopicBadge } from "@/components/TopicBadge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useDigest } from "@/context/DigestContext";
import { Article, TOPICS } from "@/lib/digest-types";
import { ExternalLink, Search } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

export default function ContentBrowserPage() {
  const { articles, feeds, loading } = useDigest();
  const [search, setSearch] = useState("");
  const [topicFilter, setTopicFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Article | null>(null);

  const activeFeedIds = useMemo(
    () => new Set(feeds.filter((feed) => feed.active).map((feed) => feed.id)),
    [feeds],
  );

  const filtered = useMemo(
    () =>
      articles.filter((article) => {
        const matchesSearch =
          article.title.toLowerCase().includes(search.toLowerCase()) ||
          article.feedName.toLowerCase().includes(search.toLowerCase());
        const matchesTopic = topicFilter === "all" || article.topic === topicFilter;
        return matchesSearch && matchesTopic;
      }),
    [articles, search, topicFilter],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Content Browser</h1>
          <p className="mt-1 text-sm text-muted-foreground">
          {loading ? "Loading article index..." : "Browse fetched articles and the summaries used to assemble the digest"}
          </p>
        </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative max-w-sm min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search articles..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="bg-card pl-9"
          />
        </div>
        <Select value={topicFilter} onValueChange={setTopicFilter}>
          <SelectTrigger className="w-40 bg-card">
            <SelectValue placeholder="All Topics" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Topics</SelectItem>
            {TOPICS.map((topic) => (
              <SelectItem key={topic} value={topic}>
                {topic}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
        {filtered.map((article) => (
          <div
            key={article.id}
            onClick={() => setSelected(article)}
            className="cursor-pointer rounded-lg border bg-card p-4 transition-colors hover:bg-secondary/50"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-medium leading-snug">{article.title}</h3>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <TopicBadge topic={article.topic} />
                  <Badge variant="secondary" className="text-xs font-mono">
                    {article.feedName}
                  </Badge>
                  {!activeFeedIds.has(article.feedId) && (
                    <Badge variant="outline" className="text-xs">
                      Feed inactive
                    </Badge>
                  )}
                  <span className="font-mono text-xs text-muted-foreground">
                    {format(new Date(article.publishedAt), "MMM d, HH:mm")}
                  </span>
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{article.summary}</p>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            No articles match your search criteria
          </div>
        )}
      </motion.div>

      <Sheet open={!!selected} onOpenChange={() => setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto border-border bg-card sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="pr-4 text-base leading-snug">{selected?.title}</SheetTitle>
            <SheetDescription className="flex flex-wrap items-center gap-2">
              {selected && <TopicBadge topic={selected.topic} />}
              <span className="font-mono text-xs">{selected?.feedName}</span>
              <span className="text-xs">
                {selected && format(new Date(selected.publishedAt), "MMM d, yyyy HH:mm")}
              </span>
            </SheetDescription>
          </SheetHeader>
          {selected && (
            <div className="mt-6 space-y-4">
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Digest Summary
                </p>
                <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-sm">
                  {selected.summary}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Full Text
                </p>
                <div className="rounded-md bg-background p-3 text-sm leading-relaxed text-secondary-foreground">
                  {selected.fullText}
                </div>
              </div>
              <a
                href={selected.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                Open original <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
