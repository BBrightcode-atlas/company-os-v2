import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Settings2, GripVertical, Trash2 } from "lucide-react";

interface PipelineStep {
  slug: string; name: string; type: string; executor: string; config?: Record<string, unknown>;
}

export function PipelineStepEditor({ steps, onUpdate }: { steps: PipelineStep[]; onUpdate: (steps: PipelineStep[]) => void }) {
  const removeStep = (index: number) => onUpdate(steps.filter((_, i) => i !== index));

  return (
    <div className="space-y-2">
      {steps.map((step, i) => (
        <Card key={step.slug}>
          <CardContent className="flex items-center gap-3 p-3">
            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
            <span className="flex-1 text-sm font-medium">{i + 1}. {step.name}</span>
            <Badge variant="outline" className="text-xs">{step.type}</Badge>
            <Badge variant="secondary" className="text-xs">{step.executor}</Badge>
            <Button variant="ghost" size="icon" className="h-7 w-7"><Settings2 className="h-3.5 w-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeStep(i)}><Trash2 className="h-3.5 w-3.5" /></Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
