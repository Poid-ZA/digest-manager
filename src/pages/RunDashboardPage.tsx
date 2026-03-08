import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useDigest } from "@/context/DigestContext";
import { useToast } from "@/components/ui/use-toast";
import { DigestRun } from "@/lib/digest-types";
import { AlertTriangle, Clock, Play, Radio } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { motion } from "framer-motion";

const STATUS_MAP = {
  success: { label: "Success", dotClass: "status-dot-success", badgeClass: "bg-success/20 text-success border-0" },
  partial: { label: "Partial", dotClass: "status-dot-warning", badgeClass: "bg-warning/20 text-warning border-0" },
  failed: { label: "Failed", dotClass: "status-dot-error", badgeClass: "bg-destructive/20 text-destructive border-0" },
};

export default function RunDashboardPage() {
  const { loading, refreshing, runs, triggerRun } = useDigest();
  const { toast } = useToast();
  const [selectedRun, setSelectedRun] = useState<DigestRun | null>(null);

  const orderedRuns = useMemo(
    () => [...runs].sort((left, right) => Date.parse(right.date) - Date.parse(left.date)),
    [runs],
  );

  const stats = useMemo(() => {
    const total = orderedRuns.length;
    const success = orderedRuns.filter((run) => run.status === "success").length;
    const avgArticles =
      total === 0
        ? 0
        : Math.round(
            orderedRuns.reduce((sum, run) => sum + run.includedArticles, 0) / total,
          );

    return { total, success, avgArticles };
  }, [orderedRuns]);

  const handleTriggerRun = async () => {
    const digest = await triggerRun();
    setSelectedRun(digest.run);
    toast({
      title:
        digest.run.status === "success"
          ? "Manual run completed"
          : digest.run.status === "partial"
            ? "Manual run completed with warnings"
            : "Manual run failed",
      description: `${digest.run.includedArticles} articles included from ${digest.run.totalArticles} live articles fetched across active feeds.`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Run Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading ? "Loading run history..." : "Monitor digest generation runs and trigger manual builds"}
          </p>
        </div>
        <Button onClick={handleTriggerRun} disabled={refreshing}>
          <Play className="mr-1 h-4 w-4" /> Trigger Run
        </Button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 gap-4 sm:grid-cols-3"
      >
        {[
          { label: "Total Runs", value: stats.total, sub: "Persisted on the server" },
          {
            label: "Success Rate",
            value: stats.total === 0 ? "0%" : `${Math.round((stats.success / stats.total) * 100)}%`,
            sub: `${stats.success}/${stats.total} successful`,
          },
          { label: "Avg. Articles", value: stats.avgArticles, sub: "Per digest" },
        ].map((item) => (
          <div key={item.label} className="rounded-lg border bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.label}</p>
            <p className="mt-1 font-mono text-2xl font-semibold">{item.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{item.sub}</p>
          </div>
        ))}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="overflow-hidden rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead className="text-right">Fetched</TableHead>
                <TableHead className="text-right">Included</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Errors</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orderedRuns.map((run) => {
                const status = STATUS_MAP[run.status];
                return (
                  <TableRow
                    key={run.id}
                    className="cursor-pointer hover:bg-secondary/50"
                    onClick={() => setSelectedRun(run)}
                  >
                    <TableCell>
                      <Badge variant="outline" className={status.badgeClass}>
                        <span className={`${status.dotClass} mr-1.5`} />
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {format(new Date(run.date), "MMM d, yyyy HH:mm")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs font-mono">
                        {run.triggeredBy}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">{run.totalArticles}</TableCell>
                    <TableCell className="text-right font-mono">{run.includedArticles}</TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      <Clock className="mr-1 inline h-3 w-3" />
                      {run.duration}
                    </TableCell>
                    <TableCell>
                      {run.errors.length > 0 ? (
                        <Badge variant="outline" className="border-0 bg-destructive/10 text-xs text-destructive">
                          <AlertTriangle className="mr-1 h-3 w-3" />
                          {run.errors.length}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">None</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </motion.div>

      <Sheet open={!!selectedRun} onOpenChange={() => setSelectedRun(null)}>
        <SheetContent className="w-full border-border bg-card sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Run Details</SheetTitle>
            <SheetDescription>
              {selectedRun && format(new Date(selectedRun.date), "MMMM d, yyyy HH:mm")}
            </SheetDescription>
          </SheetHeader>
          {selectedRun && (
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md bg-background p-3">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className="mt-1 font-mono">{STATUS_MAP[selectedRun.status].label}</p>
                </div>
                <div className="rounded-md bg-background p-3">
                  <p className="text-xs text-muted-foreground">Duration</p>
                  <p className="mt-1 font-mono">{selectedRun.duration}</p>
                </div>
                <div className="rounded-md bg-background p-3">
                  <p className="text-xs text-muted-foreground">Articles Fetched</p>
                  <p className="mt-1 font-mono">{selectedRun.totalArticles}</p>
                </div>
                <div className="rounded-md bg-background p-3">
                  <p className="text-xs text-muted-foreground">Articles Included</p>
                  <p className="mt-1 font-mono">{selectedRun.includedArticles}</p>
                </div>
              </div>
              <div className="rounded-md bg-background p-3">
                <p className="text-xs text-muted-foreground">Trigger Source</p>
                <p className="mt-1 font-mono">{selectedRun.triggeredBy}</p>
              </div>
              <div className="rounded-md bg-background p-3">
                <p className="text-xs text-muted-foreground">Digest Feed</p>
                <Link to="/digest-feed" className="mt-1 inline-flex items-center gap-1 text-sm text-primary hover:underline">
                  Open latest feed view <Radio className="h-3 w-3" />
                </Link>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium">Digest Preview</p>
                <div className="max-h-72 overflow-auto rounded-md bg-background p-3 font-mono text-xs whitespace-pre-wrap">
                  {selectedRun.preview || "No digest preview stored for this run."}
                </div>
              </div>
              {selectedRun.errors.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-medium text-destructive">Errors</p>
                  <div className="space-y-1">
                    {selectedRun.errors.map((error) => (
                      <div
                        key={error}
                        className="rounded-md bg-destructive/10 p-2 text-sm font-mono text-destructive"
                      >
                        {error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
