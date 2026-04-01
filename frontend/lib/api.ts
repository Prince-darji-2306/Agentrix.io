import { ChatMode } from "./store";

const env = import.meta.env as Record<string, string | undefined>;
const API_BASE =
  env.VITE_API_URL ||
  env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000";

// ─── Auth Headers ─────────────────────────────────────────────────────────────

export function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("agentrix_token");
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

// ─── Auth API ─────────────────────────────────────────────────────────────────

export interface AuthResponse {
  token: string;
  user_id: string;
  display_name: string | null;
}

export async function register(email: string, password: string, display_name: string | null): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, display_name }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Registration failed" }));
    throw new Error(error.detail || "Registration failed");
  }
  return res.json();
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Login failed" }));
    throw new Error(error.detail || "Login failed");
  }
  return res.json();
}

// ─── History API ──────────────────────────────────────────────────────────────

export interface HistoryMessage {
  id: string;
  reasoning_mode: string;
  content: Array<{ user: string; assistant: string; pdfs?: string[] }>;
  confidence: number | null;
  consistency: number | null;
  created_at: string;
}

export interface HistoryConversation {
  id: string;
  type: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages: HistoryMessage[];
}

export async function getHistory(): Promise<HistoryConversation[]> {
  const res = await fetch(`${API_BASE}/history`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`History API error: ${res.status} - ${error}`);
  }
  const data = await res.json();
  return data.conversations || [];
}

export async function renameConversation(conversationId: string, title: string): Promise<void> {
  const res = await fetch(`${API_BASE}/history/${conversationId}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify({ title }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Rename failed" }));
    throw new Error(error.detail || "Rename failed");
  }
}

export async function deleteConversation(conversationId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/history/${conversationId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Delete failed" }));
    throw new Error(error.detail || "Delete failed");
  }
}

export async function getConversationMessages(conversationId: string): Promise<HistoryConversation> {
  const res = await fetch(`${API_BASE}/history/${conversationId}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Conversation API error: ${res.status} - ${error}`);
  }
  return res.json();
}

export async function clearAllHistory(): Promise<{ deleted: number }> {
  const res = await fetch(`${API_BASE}/history`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Clear failed" }));
    throw new Error(error.detail || "Clear failed");
  }
  return res.json();
}

// ─── Memory API ───────────────────────────────────────────────────────────────

export interface PdfSummary {
  id: string;
  pdf_id: string;
  doc_name: string;
  doc_summary: string;
  topic_tags: string[];
  user_id: string;
  conversation_id: string | null;
}

export async function getMemoryPdfs(): Promise<PdfSummary[]> {
  const res = await fetch(`${API_BASE}/memory/pdfs`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Memory API error: ${res.status} - ${error}`);
  }
  const data = await res.json();
  return data.pdfs || [];
}

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
  conversation_id?: string;
}

// ─── Smart Orchestrator (SSE) ────────────────────────────────────────────────

export type SmartOrchestratorPath = "standard" | "deep_research" | "code";

export interface SmartSSEEvent {
  type: "route" | "stage" | "node_update" | "chunk" | "plan" | "code_section" | "final" | "done" | "error" | "conversation_id";
  path?: SmartOrchestratorPath;
  reason?: string;
  stage?: string;
  message?: string;
  node_id?: string;
  status?: "running" | "completed" | "error";
  label?: string;
  node_type?: string;
  x?: number;
  y?: number;
  output?: string | null;
  content?: string;
  subtasks?: Array<{ id: number; description: string; agent_type?: string; signatures?: string[] }>;
  section?: "problem_understanding" | "approach" | "code";
  result?: string;
  conversation_id?: string;
  meta?: {
    confidence_score: number;
    logical_consistency: number;
    critic_feedback: string;
    retry_count: number;
    tools_used: string[];
    orchestrator_raw?: OrchestratorApiResponse;
  };
}

// ─── Standard Chat ────────────────────────────────────────────────────────────

// Non-streaming chat call - matches backend /chat JSON response
export async function callChatApiNonStreaming(
  query: string, 
  conversationId?: string | null,
  pdfs?: string[]
): Promise<ChatResult & { conversation_id?: string }> {
  const body: Record<string, unknown> = { query };
  if (conversationId) body.conversation_id = conversationId;
  if (pdfs) body.pdfs = pdfs;

  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
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
    conversation_id: data.conversation_id,
  };
}

export async function callChatApi(
  query: string, 
  conversationId?: string | null,
  pdfs?: string[]
): Promise<ChatResult & { conversation_id?: string }> {
  // Use non-streaming version to match backend
  return await callChatApiNonStreaming(query, conversationId, pdfs);
}

export async function callOrchestratorApi(
  task: string,
  onLog: (log: string) => void,
  conversationId?: string | null,
  pdfs?: string[]
): Promise<ChatResult & { orchestratorRaw?: OrchestratorApiResponse }> {
  const body: Record<string, unknown> = { task };
  if (conversationId) body.conversation_id = conversationId;
  if (pdfs) body.pdfs = pdfs;

  const res = await fetch(`${API_BASE}/orchestrator/task`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Orchestrator API error: ${res.status} – ${error}`);
  }

  const data: { result: OrchestratorApiResponse; conversation_id?: string } = await res.json();
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
    conversation_id: data.conversation_id,
  };
}

// ─── Debate Stream (SSE) ──────────────────────────────────────────────────────

export async function* streamDebate(
  topic: string,
  rounds: number = 3,
  conversationId?: string | null
): AsyncGenerator<DebateMessage> {
  let url = `${API_BASE}/debate/stream?topic=${encodeURIComponent(topic)}&rounds=${rounds}`;
  if (conversationId) url += `&conversation_id=${encodeURIComponent(conversationId)}`;

  const res = await fetch(url, {
    headers: getAuthHeaders(),
  });

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

// ─── Smart Orchestrator Stream ───────────────────────────────────────────────

export async function* callSmartOrchestratorStream(
  task: string, 
  conversationId?: string | null,
  pdfs?: string[]
): AsyncGenerator<SmartSSEEvent> {
  const body: Record<string, unknown> = { task };
  if (conversationId) body.conversation_id = conversationId;
  if (pdfs) body.pdfs = pdfs;

  const res = await fetch(`${API_BASE}/smart-orchestrator/stream`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok || !res.body) {
    const error = await res.text();
    throw new Error(`Smart Orchestrator error: ${res.status} - ${error}`);
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
          const msg: SmartSSEEvent = JSON.parse(jsonStr);
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

export async function uploadPdfs(files: File[], conversationId?: string | null): Promise<any> {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));

  const token = localStorage.getItem("agentrix_token");
  const headers: HeadersInit = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let url = `${API_BASE}/upload-pdf`;
  if (conversationId) {
    url += `?conversation_id=${encodeURIComponent(conversationId)}`;
  }

  const res = await fetch(url, {
    method: "POST",
    headers,
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
  onIndicator: (indicator: string) => void,
  onNodeUpdate?: (event: SmartSSEEvent) => void,
  onContentChunk?: (section: string, content: string) => void,
  conversationId?: string | null,
  pdfs?: string[]
): Promise<ChatResult> {
  if (mode === "standard") {
    onIndicator("Analyzing input…");
    const result = await callChatApi(prompt, conversationId, pdfs);
    onIndicator("");
    return result;
  }

  // multi-agent → smart orchestrator with SSE streaming
  if (mode === "multi-agent") {
    onIndicator("Smart Router activated…");
    let finalResult = "";
    let finalMeta: ChatResult["meta"] = {
      confidenceScore: 85,
      reasoningDepth: 0,
      retryCount: 0,
      toolsUsed: [],
    };
    let orchestratorRaw: OrchestratorApiResponse | undefined;
    let detectedPath: string | null = null;
    let codeContent = "";
    let backendConversationId: string | undefined;

    // Deep research thinking indicators
    const deepResearchIndicators = [
      "Decomposing task…",
      "Identifying research vectors…",
      "Researching sources…",
      "Executing tools…",
      "Synthesizing findings…",
      "Verifying facts…",
    ];
    let indicatorIdx = 0;
    let indicatorInterval: ReturnType<typeof setInterval> | null = null;

    try {
      for await (const event of callSmartOrchestratorStream(prompt, conversationId, pdfs)) {
        switch (event.type) {
          case "conversation_id":
            backendConversationId = event.conversation_id;
            break;
          case "route":
            detectedPath = event.path || null;
            if (onNodeUpdate) onNodeUpdate(event);

            // For deep_research, start cycling through thinking indicators
            if (detectedPath === "deep_research") {
              onIndicator(deepResearchIndicators[0]);
              indicatorInterval = setInterval(() => {
                indicatorIdx++;
                if (indicatorIdx < deepResearchIndicators.length) {
                  onIndicator(deepResearchIndicators[indicatorIdx]);
                }
              }, 2000);
            } else {
              onIndicator(`Routed to: ${event.path} (${event.reason})`);
            }
            break;
          case "stage":
            // For deep_research, ignore stage events (we show our own indicators)
            if (detectedPath !== "deep_research") {
              onIndicator(event.message || "");
            }
            break;
          case "node_update":
            if (onNodeUpdate) onNodeUpdate(event);
            break;
          case "plan":
            onIndicator("Plan created with subtasks");
            // Show approach/plan content in the chat bubble
            if (onContentChunk && event.subtasks) {
              const approachLines = event.subtasks.map(
                (st, i) => `- **Coding Agent ${st.id}**: ${st.description}`
              ).join("\n");
              onContentChunk("approach", `The task was decomposed into ${event.subtasks.length} parallel subtasks assigned to specialized coding agents:\n\n${approachLines}\n\nAll agents respect a shared contract of function signatures to ensure interoperability.`);
            }
            break;
          case "code_section":
            if (onContentChunk && event.section && event.content) {
              if (event.section === "code") {
                // Final code section - replace accumulated content
                codeContent = event.content;
                onContentChunk("code", event.content);
              } else {
                // Problem understanding or approach - accumulate
                onContentChunk(event.section, event.content);
              }
            }
            break;
          case "final":
            finalResult = event.result || "";
            if (event.meta) {
              finalMeta = {
                confidenceScore: event.meta.confidence_score,
                reasoningDepth: event.meta.tools_used?.length || 0,
                retryCount: event.meta.retry_count,
                toolsUsed: event.meta.tools_used || [],
                logicalConsistency: event.meta.logical_consistency,
                criticFeedback: event.meta.critic_feedback,
              };
              if (event.meta.orchestrator_raw) {
                orchestratorRaw = event.meta.orchestrator_raw;
              }
            }
            break;
          case "error":
            throw new Error(event.message || "Unknown error");
        }
      }
    } finally {
      if (indicatorInterval) clearInterval(indicatorInterval);
      onIndicator("");
    }

    return {
      content: finalResult,
      meta: finalMeta,
      orchestratorRaw,
      conversation_id: backendConversationId,
    };
  }

  // deep-research → orchestrator (non-streaming)
  const indicators = [
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
    let result = await callOrchestratorApi(prompt, (log) => onIndicator(log), conversationId, pdfs);
    if (result.orchestratorRaw) {
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
