import { useState } from "react";
import { mockFeeds, Feed, TOPICS, TopicCategory } from "@/lib/mock-data";
import { TopicBadge } from "@/components/TopicBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Upload, Download, Search } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

export default function FeedsPage() {
  const [feeds, setFeeds] = useState<Feed[]>(mockFeeds);
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingFeed, setEditingFeed] = useState<Feed | null>(null);

  const filtered = feeds.filter(
    (f) =>
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.url.toLowerCase().includes(search.toLowerCase())
  );

  const openNew = () => {
    setEditingFeed(null);
    setDrawerOpen(true);
  };
  const openEdit = (feed: Feed) => {
    setEditingFeed(feed);
    setDrawerOpen(true);
  };

  const toggleActive = (id: string) => {
    setFeeds((prev) =>
      prev.map((f) => (f.id === id ? { ...f, active: !f.active } : f))
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Feed Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {feeds.length} feeds configured · {feeds.filter((f) => f.active).length} active
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Upload className="w-4 h-4 mr-1" /> Import
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-1" /> Export
          </Button>
          <Button size="sm" onClick={openNew}>
            <Plus className="w-4 h-4 mr-1" /> Add Feed
          </Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search feeds..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-card"
        />
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="rounded-lg border bg-card overflow-hidden">
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
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Switch
                      checked={feed.active}
                      onCheckedChange={() => toggleActive(feed.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div>
                      <span className="font-medium">{feed.name}</span>
                      <p className="text-xs text-muted-foreground font-mono truncate max-w-[300px]">
                        {feed.url}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <TopicBadge topic={feed.topic} />
                  </TableCell>
                  <TableCell className="text-right font-mono">{feed.weight}</TableCell>
                  <TableCell className="text-right font-mono">{feed.articleCount}</TableCell>
                  <TableCell className="text-muted-foreground text-sm font-mono">
                    {feed.lastFetched
                      ? format(new Date(feed.lastFetched), "MMM d, HH:mm")
                      : "Never"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </motion.div>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="bg-card border-border w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{editingFeed ? "Edit Feed" : "Add Feed"}</SheetTitle>
            <SheetDescription>
              {editingFeed ? "Modify feed configuration" : "Add a new RSS feed to monitor"}
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 mt-6">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input defaultValue={editingFeed?.name || ""} placeholder="Feed name" className="bg-background" />
            </div>
            <div className="space-y-2">
              <Label>URL</Label>
              <Input defaultValue={editingFeed?.url || ""} placeholder="https://example.com/rss" className="bg-background font-mono text-sm" />
            </div>
            <div className="space-y-2">
              <Label>Topic</Label>
              <Select defaultValue={editingFeed?.topic || "Technology"}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TOPICS.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Weight (1-10)</Label>
              <Input type="number" min={1} max={10} defaultValue={editingFeed?.weight || 5} className="bg-background font-mono" />
            </div>
            <div className="flex items-center gap-3">
              <Switch defaultChecked={editingFeed?.active ?? true} />
              <Label>Active</Label>
            </div>
            <div className="flex gap-2 pt-4">
              <Button className="flex-1">Save</Button>
              {editingFeed && (
                <Button variant="destructive" size="sm">Delete</Button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
