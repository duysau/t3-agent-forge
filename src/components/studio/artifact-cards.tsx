import { Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import type { Persona } from "~/server/agentforge/schemas";

export function ArtifactCards({
  persona,
  systemPrompt,
  guardrails,
}: {
  persona: Persona;
  systemPrompt: string;
  guardrails: string[];
}) {
  return (
    <div className="mt-6 space-y-5">
      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Persona</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <span
                data-testid="persona-avatar"
                className="grid size-11 place-items-center rounded-full bg-primary text-lg font-bold text-primary-foreground"
              >
                {persona.avatarLetter}
              </span>
              <div>
                <div className="font-bold text-gray-900">{persona.name}</div>
                <div className="text-[13px] text-muted-foreground">{persona.role}</div>
              </div>
            </div>
            <p className="mt-3 text-[13px] text-gray-700">{persona.description}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Guardrails</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {guardrails.map((g) => (
                <li key={g} className="flex gap-2 text-[13px] text-gray-700">
                  <Check className="mt-0.5 size-3.5 shrink-0 text-success" />
                  {g}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">System prompt</CardTitle>
        </CardHeader>
        <CardContent>
          <pre
            data-testid="system-prompt"
            className="max-h-64 overflow-auto rounded-lg bg-muted p-3 font-mono text-xs whitespace-pre-wrap text-gray-800"
          >
            {systemPrompt}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
