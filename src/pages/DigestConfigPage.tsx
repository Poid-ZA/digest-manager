import { useState } from "react";
import { mockConfig, TOPICS, DigestConfig, TopicCategory } from "@/lib/mock-data";
import { TopicBadge } from "@/components/TopicBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Send, Plus, X } from "lucide-react";
import { motion } from "framer-motion";

export default function DigestConfigPage() {
  const [config, setConfig] = useState<DigestConfig>(mockConfig);
  const [newRecipient, setNewRecipient] = useState("");

  const addRecipient = () => {
    if (newRecipient && !config.recipients.includes(newRecipient)) {
      setConfig((c) => ({ ...c, recipients: [...c.recipients, newRecipient] }));
      setNewRecipient("");
    }
  };

  const removeRecipient = (email: string) => {
    setConfig((c) => ({
      ...c,
      recipients: c.recipients.filter((r) => r !== email),
    }));
  };

  const setTopicLimit = (topic: TopicCategory, value: number) => {
    setConfig((c) => ({
      ...c,
      topicLimits: { ...c.topicLimits, [topic]: value },
    }));
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold">Digest Configuration</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure how the daily digest is generated and delivered
        </p>
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-base">Articles Per Topic</CardTitle>
            <CardDescription>Maximum number of articles included per topic category</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {TOPICS.map((topic) => (
              <div key={topic} className="flex items-center justify-between">
                <TopicBadge topic={topic} />
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={config.topicLimits[topic]}
                  onChange={(e) => setTopicLimit(topic, parseInt(e.target.value) || 1)}
                  className="w-20 bg-background font-mono text-center"
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-base">Summary Length</CardTitle>
            <CardDescription>Control the verbosity of AI-generated summaries</CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={config.summaryLength}
              onValueChange={(v) => setConfig((c) => ({ ...c, summaryLength: v as DigestConfig["summaryLength"] }))}
            >
              <SelectTrigger className="bg-background w-48">
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
            <CardTitle className="text-base">Email Recipients</CardTitle>
            <CardDescription>Manage who receives the daily digest</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={newRecipient}
                onChange={(e) => setNewRecipient(e.target.value)}
                placeholder="email@example.com"
                className="bg-background font-mono text-sm"
                onKeyDown={(e) => e.key === "Enter" && addRecipient()}
              />
              <Button size="sm" onClick={addRecipient}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {config.recipients.map((email) => (
                <Badge key={email} variant="secondary" className="font-mono text-xs gap-1 pl-2 pr-1">
                  {email}
                  <button onClick={() => removeRecipient(email)} className="hover:text-destructive">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button>Save Configuration</Button>
          <Button variant="outline">
            <Send className="w-4 h-4 mr-1" /> Send Test Email
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
