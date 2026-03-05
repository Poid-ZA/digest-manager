import { useState } from "react";
import { mockRuns, DigestRun } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Play, Clock, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

const STATUS_MAP = {
  success: { label: "Success", dotClass: "status-dot-success", badgeClass: "bg-success/20 text-success border-0" },
  partial: { label: "Partial", dotClass: "status-dot-warning", badgeClass: "bg-warning/20 text-warning border-0" },
  failed: { label: "Failed", dotClass: "status-dot-error", badgeClass: "bg-destructive/20 text-destructive border-0" },
};

export default function RunDashboardPage() {
  const [runs] = useState<DigestRun[]>(mockRuns);
  const [selectedRun, setSelectedRun] = useState<DigestRun | null>(null);

  const stats = {
    total: runs.length,
    success: runs.filter((r) => r.status === "success").length,
    avgArticles: Math.round(runs.reduce((s, r) => s + r.includedArticles, 0) / runs.length),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Run Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor digest generation runs and trigger manual builds
          </p>
        </div>
        <Button>
          <Play className="w-4 h-4 mr-1" /> Trigger Run
        </Button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        {[
          { label: "Total Runs", value: stats.total, sub: "Last 7 days" },
          { label: "Success Rate", value: `${Math.round((stats.success / stats.total) * 100)}%`, sub: `${stats.success}/${stats.total} successful` },
          { label: "Avg. Articles", value: stats.avgArticles, sub: "Per digest" },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{s.label}</p>
            <p className="text-2xl font-semibold font-mono mt-1">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
          </div>
        ))}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="rounded-lg border bg-card overflow-hidden">
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
              {runs.map((run) => {
                const st = STATUS_MAP[run.status];
                return (
                  <TableRow
                    key={run.id}
                    className="cursor-pointer hover:bg-secondary/50"
                    onClick={() => setSelectedRun(run)}
                  >
                    <TableCell>
                      <Badge variant="outline" className={st.badgeClass}>
                        <span className={`${st.dotClass} mr-1.5`} />
                        {st.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {format(new Date(run.date), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs font-mono">
                        {run.triggeredBy}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">{run.totalArticles}</TableCell>
                    <TableCell className="text-right font-mono">{run.includedArticles}</TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      <Clock className="w-3 h-3 inline mr-1" />
                      {run.duration}
                    </TableCell>
                    <TableCell>
                      {run.errors.length > 0 && (
                        <Badge variant="outline" className="bg-destructive/10 text-destructive border-0 text-xs">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          {run.errors.length}
                        </Badge>
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
        <SheetContent className="bg-card border-border w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Run Details</SheetTitle>
            <SheetDescription>
              {selectedRun && format(new Date(selectedRun.date), "MMMM d, yyyy")}
            </SheetDescription>
          </SheetHeader>
          {selectedRun && (
            <div className="space-y-4 mt-6">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md bg-background p-3">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className="font-mono mt-1">{STATUS_MAP[selectedRun.status].label}</p>
                </div>
                <div className="rounded-md bg-background p-3">
                  <p className="text-xs text-muted-foreground">Duration</p>
                  <p className="font-mono mt-1">{selectedRun.duration}</p>
                </div>
                <div className="rounded-md bg-background p-3">
                  <p className="text-xs text-muted-foreground">Articles Fetched</p>
                  <p className="font-mono mt-1">{selectedRun.totalArticles}</p>
                </div>
                <div className="rounded-md bg-background p-3">
                  <p className="text-xs text-muted-foreground">Articles Included</p>
                  <p className="font-mono mt-1">{selectedRun.includedArticles}</p>
                </div>
              </div>
              {selectedRun.errors.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-destructive mb-2">Errors</p>
                  <div className="space-y-1">
                    {selectedRun.errors.map((err, i) => (
                      <div key={i} className="rounded-md bg-destructive/10 p-2 text-sm font-mono text-destructive">
                        {err}
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
