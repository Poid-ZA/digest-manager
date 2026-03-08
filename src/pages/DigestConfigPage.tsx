import { useEffect, useMemo, useState } from "react";
import { TopicBadge } from "@/components/TopicBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useDigest } from "@/context/DigestContext";
import { useToast } from "@/components/ui/use-toast";
import { DigestConfig, TopicCategory, TOPICS } from "@/lib/digest-types";
import { Radio, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";

export default function DigestConfigPage() {
  const { config, loading, refreshing, saveConfig, resetWorkspace } = useDigest();
  const { toast } = useToast();
  const [draft, setDraft] = useState<DigestConfig>(config);

  useEffect(() => {
    setDraft(config);
  }, [config]);

  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(config) !== JSON.stringify(draft),
    [config, draft],
  );

  const setTopicLimit = (topic: TopicCategory, value: number) => {
    setDraft((current) => ({
      ...current,
      topicLimits: { ...current.topicLimits, [topic]: value },
    }));
  };

  const handleSave = async () => {
    await saveConfig(draft);
    toast({
      title: "Configuration saved",
      description: "Digest selection and summary settings have been updated.",
    });
  };

  const handleReset = async () => {
    await resetWorkspace();
    toast({
      title: "Workspace reset",
      description: "Feeds and configuration were reset to the default real feed set.",
    });
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Digest Configuration</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading ? "Loading configuration..." : "Configure how the daily digest is generated and published"}
          </p>
        </div>
        <Button variant="outline" onClick={handleReset}>
          <RotateCcw className="mr-1 h-4 w-4" /> Reset Workspace
        </Button>
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-base">Articles Per Topic</CardTitle>
            <CardDescription>Maximum number of articles included per topic category</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {TOPICS.map((topic) => (
              <div key={topic} className="flex items-center justify-between gap-4">
                <TopicBadge topic={topic} />
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={draft.topicLimits[topic]}
                  onChange={(event) => setTopicLimit(topic, Number(event.target.value || 1))}
                  className="w-20 bg-background text-center font-mono"
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-base">Summary Length</CardTitle>
            <CardDescription>Control the verbosity of generated summaries</CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={draft.summaryLength}
              onValueChange={(value) =>
                setDraft((current) => ({
                  ...current,
                  summaryLength: value as DigestConfig["summaryLength"],
                }))
              }
            >
              <SelectTrigger className="w-48 bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="brief">Brief (~1 sentence)</SelectItem>
                <SelectItem value="medium">Medium (~2-3 sentences)</SelectItem>
                <SelectItem value="detailed">Detailed (~paragraph)</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Radio className="h-4 w-4" />
              Publishing Mode
            </CardTitle>
            <CardDescription>The digest is published for in-browser review and RSS consumption only.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-md bg-background p-3 text-sm text-muted-foreground">
              Manual runs now publish the digest into the in-app feed view. Use the new <span className="font-medium text-foreground">Digest Feed</span> page to inspect the latest curated output and copy the RSS XML.
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={!hasUnsavedChanges || refreshing}>
            Save Configuration
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
