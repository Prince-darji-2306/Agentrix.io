import { ChatMode } from "./store";

const env = import.meta.env as Record<string, string | undefined>;
const API_BASE =
  env.VITE_API_URL ||
  env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChatApiResponse {
  answer: string;
  tools_used: { tool: string; args: Record<string, unknown> }[];
  message_count: number;
}

export interface ChatStreamEvent {
  type: "stream" | "final" | "error";
  content?: string;
  answer?: string;
  tools_used?: { tool: string; args: Record<string, unknown> }[];
  message?: string;
}

export interface OrchestratorSubtask {
  id: number;
  description: string;
  agent_type: string;
  result: string;
}

export interface OrchestratorApiResponse {
  final_result: string;
  subtasks: OrchestratorSubtask[];
  step_logs: string[];
  critic_confidence: number;
  critic_logical_consistency: number;
  critic_feedback: string;
}

export interface DebateMessage {
  type: "info" | "round" | "message" | "verdict" | "done";
  message?: string;
  round?: number;
  total_rounds?: number;
  agent?: string;
  agent_id?: "A" | "B";
  position?: "FOR" | "AGAINST";
  content?: string;
}

export interface ChatResult {
  content: string;
  meta: {
    confidenceScore: number;
    reasoningDepth: number;
    retryCount: number;
    toolsUsed: string[];
    logicalConsistency?: number;
    criticFeedback?: string;
  };
  orchestratorRaw?: OrchestratorApiResponse & {
    critic_confidence?: number;
    critic_logical_consistency?: number;
    critic_feedback?: string;
  }; // only present when orchestrator was used
}

// ─── Standard Chat ────────────────────────────────────────────────────────────

// Non-streaming chat call - matches backend /chat JSON response
export async function callChatApiNonStreaming(query: string): Promise<ChatResult> {
  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Chat API error: ${res.status} - ${error}`);
  }

  const data = await res.json();
  const result = data.result as { answer: string; tools_used: { tool: string; args: Record<string, unknown> }[]; message_count: number };

  return {
    content: result.answer || "No response received.",
    meta: {
      confidenceScore: 85,
      reasoningDepth: 2,
      retryCount: 0,
      toolsUsed: result.tools_used?.map((t) => t.tool) ?? [],
    },
  };
}

// // DEPRECATED: Streaming version - kept for reference but not used with current backend
// export async function* streamChatApi(query: string): AsyncGenerator<ChatStreamEvent> {
//   const res = await fetch(`${API_BASE}/chat`, {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ query }),
//   });

//   if (!res.ok || !res.body) {
//     const error = await res.text();
//     throw new Error(`Chat API error: ${res.status} - ${error}`);
//   }

//   const reader = res.body.getReader();
//   const decoder = new TextDecoder();
//   let buffer = "";

//   while (true) {
//     const { done, value } = await reader.read();
//     if (done) break;

//     buffer += decoder.decode(value, { stream: true });
//     const lines = buffer.split("\n");
//     buffer = lines.pop() ?? "";

//     for (const line of lines) {
//       if (!line.startsWith("data: ")) continue;
//       const jsonStr = line.slice(6).trim();
//       if (!jsonStr) continue;
//       try {
//         const msg: ChatStreamEvent = JSON.parse(jsonStr);
//         yield msg;
//       } catch {
//         // skip malformed lines
//       }
//     }
//   }
// }

export async function callChatApi(query: string): Promise<ChatResult> {
  // Use non-streaming version to match backend
  return await callChatApiNonStreaming(query);
}

export async function callOrchestratorApi(
  task: string,
  onLog: (log: string) => void
): Promise<ChatResult & { orchestratorRaw?: OrchestratorApiResponse }> {
  const res = await fetch(`${API_BASE}/orchestrator/task`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ task }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Orchestrator API error: ${res.status} – ${error}`);
  }

  const data: { result: OrchestratorApiResponse } = await res.json();
  const r = data.result;

  // Emit logs so the UI can show progress
  for (const log of r.step_logs ?? []) {
    onLog(log);
  }

  // Build rich markdown content from the orchestrator result
  const subtaskSection = r.subtasks
    .map(
      (st) =>
        `### ${agentEmoji(st.agent_type)} ${capitalize(st.agent_type)} Agent\n**Task:** ${st.description}\n\n${st.result ?? ""}`
    )
    .join("\n\n---\n\n");

  const content = `## Final Answer\n\n${r.final_result}`;

  return {
    content,
    meta: {
      confidenceScore: r.critic_confidence ?? 88,
      reasoningDepth: r.subtasks.length + 1,
      retryCount: 0,
      toolsUsed: r.subtasks.map((st) => `${capitalize(st.agent_type)}Agent`),
      logicalConsistency: r.critic_logical_consistency,
      criticFeedback: r.critic_feedback,
    },
    orchestratorRaw: { ...r }, // include raw data for graph visualization
  };
}

// ─── Debate Stream (SSE) ──────────────────────────────────────────────────────

export async function* streamDebate(
  topic: string,
  rounds: number = 3
): AsyncGenerator<DebateMessage> {
  const url = `${API_BASE}/debate/stream?topic=${encodeURIComponent(topic)}&rounds=${rounds}`;
  const res = await fetch(url);

  if (!res.ok || !res.body) {
    throw new Error(`Debate stream error: ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const jsonStr = line.slice(6).trim();
        if (!jsonStr) continue;
        try {
          const msg: DebateMessage = JSON.parse(jsonStr);
          yield msg;
          if (msg.type === "done") return;
        } catch {
          // skip malformed lines
        }
      }
    }
  }
}

// ─── Unified entry-point for ChatPage ────────────────────────────────────────

export async function uploadPdfs(files: File[], userId: string = "default_user"): Promise<any> {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  formData.append("user_id", userId);

  const res = await fetch(`${API_BASE}/upload-pdf`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Upload API error: ${res.status} – ${error}`);
  }

  return res.json();
}

export async function generateResponse(
  prompt: string,
  mode: ChatMode,
  onIndicator: (indicator: string) => void
): Promise<ChatResult> {
  if (mode === "standard") {
    onIndicator("Analyzing input…");
    const result = await callChatApi(prompt);
    onIndicator("");
    return result;
  }

  // multi-agent or deep-research → orchestrator
  const indicators =
    mode === "multi-agent"
      ? [
          "Orchestrator activated…",
          "Spawning specialized agents…",
          "Planner agent reasoning…",
          "Executor agent processing…",
          "Aggregating results…",
        ]
      : [
          "Decomposing task…",
          "Identifying research vectors…",
          "Researching sources…",
          "Executing tools…",
          "Synthesizing findings…",
          "Verifying facts…",
        ];

  let indicatorIdx = 0;
  const tickInterval = setInterval(() => {
    if (indicatorIdx < indicators.length) {
      onIndicator(indicators[indicatorIdx++]);
    }
  }, 1500);

  try {
    let result = await callOrchestratorApi(prompt, (log) => onIndicator(log));
    // For deep-research mode, only show the final aggregator result (hide agent breakdown)
    if (mode === "deep-research" && result.orchestratorRaw) {
      result = {
        ...result,
        content: result.orchestratorRaw.final_result,
      };
    }
    return result;
  } finally {
    clearInterval(tickInterval);
    onIndicator("");
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function agentEmoji(agentType: string): string {
  const map: Record<string, string> = {
    researcher: "🔍",
    analyst: "📊",
    aggregator: "✍️",
    critic: "🔬",
  };
  return map[agentType] ?? "🤖";
}
