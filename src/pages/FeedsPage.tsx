import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { TopicBadge } from "@/components/TopicBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDigest } from "@/context/DigestContext";
import { useToast } from "@/components/ui/use-toast";
import { EMPTY_FEED_DRAFT, Feed, FeedDraft, TOPICS } from "@/lib/digest-types";
import { Download, Plus, Search, Upload } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

function getDraft(feed: Feed | null): FeedDraft {
  if (!feed) {
    return EMPTY_FEED_DRAFT;
  }

  return {
    name: feed.name,
    url: feed.url,
    topic: feed.topic,
    weight: feed.weight,
    active: feed.active,
  };
}

export default function FeedsPage() {
  const { feeds, deleteFeed, exportFeeds, importFeeds, loading, refreshing, saveFeed, toggleFeedActive } = useDigest();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingFeed, setEditingFeed] = useState<Feed | null>(null);
  const [draft, setDraft] = useState<FeedDraft>(EMPTY_FEED_DRAFT);

  useEffect(() => {
    setDraft(getDraft(editingFeed));
  }, [editingFeed]);

  const filtered = useMemo(
    () =>
      feeds.filter(
        (feed) =>
          feed.name.toLowerCase().includes(search.toLowerCase()) ||
          feed.url.toLowerCase().includes(search.toLowerCase()),
      ),
    [feeds, search],
  );

  const openNew = () => {
    setEditingFeed(null);
    setDrawerOpen(true);
  };

  const openEdit = (feed: Feed) => {
    setEditingFeed(feed);
    setDrawerOpen(true);
  };

  const handleSave = async () => {
    try {
      await saveFeed(draft, editingFeed?.id);
      setDrawerOpen(false);
      toast({
        title: editingFeed ? "Feed updated" : "Feed added",
        description: `${draft.name} is now part of the digest configuration.`,
      });
    } catch (error) {
      toast({
        title: "Feed validation failed",
        description: error instanceof Error ? error.message : "Unable to save feed.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!editingFeed) {
      return;
    }

    await deleteFeed(editingFeed.id);
    setDrawerOpen(false);
    toast({
      title: "Feed deleted",
      description: `${editingFeed.name} was removed from the digest configuration.`,
    });
  };

  const handleExport = () => {
    const blob = new Blob([exportFeeds()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "digest-feeds.json";
    anchor.click();
    URL.revokeObjectURL(url);
    toast({
      title: "Feeds exported",
      description: "Current feed configuration downloaded as JSON.",
    });
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const importedCount = await importFeeds(await file.text());
      toast({
        title: "Feeds imported",
        description: `${importedCount} feed${importedCount === 1 ? "" : "s"} added to the workspace.`,
      });
    } catch (error) {
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "Unable to import feeds.",
        variant: "destructive",
      });
    } finally {
      event.target.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Feed Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading ? "Loading feeds..." : `${feeds.length} feeds configured · ${feeds.filter((feed) => feed.active).length} active`}
          </p>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={handleImport}
          />
          <Button variant="outline" size="sm" onClick={handleImportClick}>
            <Upload className="mr-1 h-4 w-4" /> Import
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-1 h-4 w-4" /> Export
          </Button>
          <Button size="sm" onClick={openNew}>
            <Plus className="mr-1 h-4 w-4" /> Add Feed
          </Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search feeds..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="bg-card pl-9"
        />
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="overflow-hidden rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-10">Active</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Topic</TableHead>
                <TableHead className="text-right">Weight</TableHead>
                <TableHead className="text-right">Articles</TableHead>
                <TableHead>Last Fetched</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((feed) => (
                <TableRow
                  key={feed.id}
                  className="cursor-pointer hover:bg-secondary/50"
                  onClick={() => openEdit(feed)}
                >
                  <TableCell onClick={(event) => event.stopPropagation()}>
                    <Switch checked={feed.active} disabled={refreshing} onCheckedChange={() => void toggleFeedActive(feed.id)} />
                  </TableCell>
                  <TableCell>
                    <div>
                      <span className="font-medium">{feed.name}</span>
                      <p className="max-w-[300px] truncate font-mono text-xs text-muted-foreground">
                        {feed.url}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <TopicBadge topic={feed.topic} />
                  </TableCell>
                  <TableCell className="text-right font-mono">{feed.weight}</TableCell>
                  <TableCell className="text-right font-mono">{feed.articleCount}</TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {feed.lastFetched ? format(new Date(feed.lastFetched), "MMM d, HH:mm") : "Never"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </motion.div>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-full border-border bg-card sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{editingFeed ? "Edit Feed" : "Add Feed"}</SheetTitle>
            <SheetDescription>
              {editingFeed ? "Modify feed configuration" : "Add a new RSS feed to monitor"}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="feed-name">Name</Label>
              <Input
                id="feed-name"
                value={draft.name}
                onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                placeholder="Feed name"
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="feed-url">URL</Label>
              <Input
                id="feed-url"
                value={draft.url}
                onChange={(event) => setDraft((current) => ({ ...current, url: event.target.value }))}
                placeholder="https://example.com/rss"
                className="bg-background font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label>Topic</Label>
              <Select
                value={draft.topic}
                onValueChange={(topic) =>
                  setDraft((current) => ({ ...current, topic: topic as FeedDraft["topic"] }))
                }
              >
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TOPICS.map((topic) => (
                    <SelectItem key={topic} value={topic}>
                      {topic}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="feed-weight">Weight (1-10)</Label>
              <Input
                id="feed-weight"
                type="number"
                min={1}
                max={10}
                value={draft.weight}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    weight: Number(event.target.value || 1),
                  }))
                }
                className="bg-background font-mono"
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={draft.active}
                onCheckedChange={(active) => setDraft((current) => ({ ...current, active }))}
              />
              <Label>Active</Label>
            </div>
            <div className="flex gap-2 pt-4">
              <Button className="flex-1" onClick={handleSave}>
                Save
              </Button>
              {editingFeed && (
                <Button variant="destructive" size="sm" onClick={handleDelete}>
                  Delete
                </Button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
