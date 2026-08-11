import { ShieldCheck } from "lucide-react";
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
      <div className="grid gap-5 min-[900px]:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="flex items-center gap-2 border-b border-border bg-gray-25 px-4 py-[13px] text-[13.5px] font-bold text-gray-700">
            Persona
          </div>
          <div className="p-4">
            <div className="flex items-center gap-3">
              <span
                data-testid="persona-avatar"
                className="grid size-[52px] shrink-0 place-items-center rounded-full bg-gradient-to-br from-fci-300 to-fci-600 text-xl font-extrabold text-white"
              >
                {persona.avatarLetter}
              </span>
              <div>
                <div className="text-base font-extrabold">{persona.name}</div>
                <div className="text-[13px] text-gray-500">{persona.role}</div>
              </div>
            </div>
            <p className="mt-1.5 text-[13.5px] text-gray-600">{persona.description}</p>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-border">
          <div className="flex items-center gap-2 border-b border-border bg-gray-25 px-4 py-[13px] text-[13.5px] font-bold text-gray-700">
            Guardrails
          </div>
          <div className="p-4">
            <ul className="space-y-2">
              {guardrails.map((g) => (
                <li key={g} className="flex items-start gap-2.5 text-[13.5px] text-gray-700">
                  <ShieldCheck className="mt-px size-3.5 shrink-0 text-fci-500" />
                  {g}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        <div className="flex items-center gap-2 border-b border-border bg-gray-25 px-4 py-[13px] text-[13.5px] font-bold text-gray-700">
          System prompt
        </div>
        <div className="p-4">
          <pre
            data-testid="system-prompt"
            className="max-h-[180px] overflow-y-auto rounded-lg bg-gray-900 p-3.5 font-mono text-[12.5px] leading-[1.7] whitespace-pre-wrap text-[#e6eaf5]"
          >
            {systemPrompt}
          </pre>
        </div>
      </div>
    </div>
  );
}
