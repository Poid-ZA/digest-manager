import { useState } from "react";
import { mockArticles, Article, TOPICS, TopicCategory } from "@/lib/mock-data";
import { TopicBadge } from "@/components/TopicBadge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Search, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

export default function ContentBrowserPage() {
  const [search, setSearch] = useState("");
  const [topicFilter, setTopicFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Article | null>(null);

  const filtered = mockArticles.filter((a) => {
    const matchSearch = a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.feedName.toLowerCase().includes(search.toLowerCase());
    const matchTopic = topicFilter === "all" || a.topic === topicFilter;
    return matchSearch && matchTopic;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Content Browser</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Browse fetched articles and their AI-generated summaries
        </p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search articles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card"
          />
        </div>
        <Select value={topicFilter} onValueChange={setTopicFilter}>
          <SelectTrigger className="w-40 bg-card">
            <SelectValue placeholder="All Topics" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Topics</SelectItem>
            {TOPICS.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        {filtered.map((article) => (
          <div
            key={article.id}
            onClick={() => setSelected(article)}
            className="rounded-lg border bg-card p-4 cursor-pointer hover:bg-secondary/50 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="font-medium text-sm leading-snug">{article.title}</h3>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <TopicBadge topic={article.topic} />
                  <Badge variant="secondary" className="text-xs font-mono">
                    {article.feedName}
                  </Badge>
                  <span className="text-xs text-muted-foreground font-mono">
                    {format(new Date(article.publishedAt), "MMM d, HH:mm")}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{article.summary}</p>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No articles match your search criteria
          </div>
        )}
      </motion.div>

      <Sheet open={!!selected} onOpenChange={() => setSelected(null)}>
        <SheetContent className="bg-card border-border w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-base leading-snug pr-4">{selected?.title}</SheetTitle>
            <SheetDescription className="flex items-center gap-2 flex-wrap">
              {selected && <TopicBadge topic={selected.topic} />}
              <span className="font-mono text-xs">{selected?.feedName}</span>
              <span className="text-xs">
                {selected && format(new Date(selected.publishedAt), "MMM d, yyyy HH:mm")}
              </span>
            </SheetDescription>
          </SheetHeader>
          {selected && (
            <div className="space-y-4 mt-6">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  AI Summary
                </p>
                <div className="rounded-md bg-primary/5 border border-primary/20 p-3 text-sm">
                  {selected.summary}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
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
                Open original <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
