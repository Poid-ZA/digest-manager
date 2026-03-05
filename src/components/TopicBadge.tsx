import { TopicCategory, TOPIC_COLORS } from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";

export function TopicBadge({ topic }: { topic: TopicCategory }) {
  return (
    <Badge variant="outline" className={`${TOPIC_COLORS[topic]} border-0 text-xs font-mono`}>
      {topic}
    </Badge>
  );
}
