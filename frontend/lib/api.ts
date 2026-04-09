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
  quality_score?: number;
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
  whatHappened?: {
    decomposition: string;
    researcher1: string;
    researcher2: string;
  };
}

// ─── Smart Orchestrator (SSE) ────────────────────────────────────────────────

export type SmartOrchestratorPath = "standard" | "deep_research" | "code";

export interface SmartSSEEvent {
  type: "route" | "stage" | "node_update" | "chunk" | "plan" | "code_section" | "final" | "done" | "error" | "conversation_id" | "content_chunk" | "tool_start" | "tool_end";
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
  phase?: "initial" | "final";
  tool_name?: string;
  tool_args?: Record<string, unknown>;
  tool_output?: string;
  subtasks?: Array<{ id: number; description: string; agent_type?: string; signatures?: string[] }>;
  section?: "problem_understanding" | "approach" | "code" 
           | "decomposition" | "researcher_1" | "researcher_2" 
           | "aggregation";
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

// ─── Standard Chat Stream (SSE) ──────────────────────────────────────────────

export interface ChatStreamEvent {
  type: "token" | "tool_start" | "tool_end" | "done" | "error" | "conversation_id";
  content?: string;
  phase?: "initial" | "final";
  tool_name?: string;
  tool_args?: Record<string, unknown>;
  tool_output?: string;
  answer?: string;
  tools_used?: { tool: string; args: Record<string, unknown> }[];
  retrieved_chunks?: unknown[];
  conversation_id?: string;
  message?: string;
}

export async function* callChatApiStream(
  query: string,
  conversationId?: string | null,
  pdfs?: string[]
): AsyncGenerator<ChatStreamEvent> {
  const body: Record<string, unknown> = { query };
  if (conversationId) body.conversation_id = conversationId;
  if (pdfs) body.pdfs = pdfs;

  console.log("[DEBUG] /chat/stream request body:", JSON.stringify(body));

  const res = await fetch(`${API_BASE}/chat/stream`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });

  console.log("[DEBUG] /chat/stream response status:", res.status);
  console.log("[DEBUG] /chat/stream response headers:", Object.fromEntries(res.headers.entries()));

  if (!res.ok || !res.body) {
    const error = await res.text();
    console.error("[DEBUG] /chat/stream error response body:", error);
    throw new Error(`Chat stream error: ${res.status} - ${error}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let eventCount = 0;
  const allEvents: ChatStreamEvent[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      console.log("[DEBUG] /chat/stream reading done. Total events received:", eventCount);
      console.log("[DEBUG] /chat/stream all received events:", JSON.stringify(allEvents, null, 2));
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const jsonStr = line.slice(6).trim();
        if (!jsonStr) continue;
        try {
          const msg: ChatStreamEvent = JSON.parse(jsonStr);
          eventCount++;
          allEvents.push(msg);
          console.log(`[DEBUG] /chat/stream event #${eventCount} (type: ${msg.type}):`, JSON.stringify(msg));
          yield msg;
          // NOTE: Do NOT return early on "done" — the backend sends more events
          // after the agent's "done" (like conversation_id). Let the stream
          // close naturally when reader.read() returns done=true.
        } catch (e) {
          console.warn("[DEBUG] /chat/stream failed to parse event:", e, "Raw line:", line);
          // skip malformed lines
        }
      }
    }
  }
}

export async function callOrchestratorApi(
  task: string,
  onLog: (log: string) => void,
  conversationId?: string | null,
  pdfs?: string[],
  onNodeUpdate?: (event: SmartSSEEvent) => void,
  onContentChunk?: (section: string, content: string) => void
): Promise<ChatResult & { orchestratorRaw?: OrchestratorApiResponse; whatHappened?: { decomposition: string; researcher1: string; researcher2: string } }> {
  const body: Record<string, unknown> = { task };
  if (conversationId) body.conversation_id = conversationId;
  if (pdfs) body.pdfs = pdfs;

  const res = await fetch(`${API_BASE}/orchestrator/task`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok || !res.body) {
    const error = await res.text();
    throw new Error(`Orchestrator API error: ${res.status} – ${error}`);
  }

  // Stream SSE events from orchestrator
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  let finalResult = "";
  let finalMeta: any = {};
  let backendConversationId: string | undefined;
  let whatHappened = { decomposition: "", researcher1: "", researcher2: "" };

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
          const event = JSON.parse(jsonStr);

          switch (event.type) {
            case "plan":
              // Subtasks created
              if (onLog) onLog(`Created ${event.subtasks?.length || 0} subtasks`);
              // Emit decomposition content
              if (event.subtasks) {
                const descriptions = event.subtasks
                  .filter((st: any) => st.agent_type === "researcher")
                  .map((st: any, i: number) => `- **Researcher ${st.id}:** ${st.description}`)
                  .join("\n");
                whatHappened.decomposition = descriptions;
                if (onContentChunk) onContentChunk("decomposition", descriptions);
              }
              break;

            case "content_chunk":
              if (event.section === "decomposition") {
                whatHappened.decomposition = event.content || "";
                if (onContentChunk) onContentChunk("decomposition", event.content);
              } else if (event.section === "researcher_1") {
                whatHappened.researcher1 = event.content || "";
                if (onContentChunk) onContentChunk("researcher_1", event.content);
              } else if (event.section === "researcher_2") {
                whatHappened.researcher2 = event.content || "";
                if (onContentChunk) onContentChunk("researcher_2", event.content);
              } else if (event.section === "aggregation") {
                if (onContentChunk) onContentChunk("aggregation", event.content);
              }
              break;

            case "final":
              finalResult = event.result || "";
              finalMeta = event.meta || {};
              break;

            case "conversation_id":
              backendConversationId = event.conversation_id;
              break;

            case "error":
              throw new Error(event.message || "Unknown error");
          }
        } catch (e) {
          // skip malformed lines
        }
      }
    }
  }

  // Build result
  const orchestratorRaw = finalMeta.orchestrator_raw || {};
  const toolsUsed = finalMeta.tools_used || [];

  return {
    content: finalResult || "No response received.",
    meta: {
      confidenceScore: finalMeta.confidence_score ?? 85,
      reasoningDepth: toolsUsed.length,
      retryCount: finalMeta.retry_count ?? 0,
      toolsUsed,
      logicalConsistency: finalMeta.logical_consistency,
      criticFeedback: finalMeta.critic_feedback,
    },
    orchestratorRaw,
    conversation_id: backendConversationId,
    whatHappened,
  };
}

// ─── Debate Stream (SSE) ──────────────────────────────────────────────────────

export async function* streamDebate(
  topic: string,
  rounds: number = 3,
  conversationId?: string | null
): AsyncGenerator<DebateMessage> {
  let url = `${API_BASE}/debate/stream?topic=${encodeURIComponent(topic)}&rounds=${rounds}`;
  // if (conversationId) url += `&conversation_id=${encodeURIComponent(conversationId)}`;

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
    let initialContent = "";
    let finalContent = "";
    let toolsUsed: string[] = [];
    let backendConversationId: string | undefined;

    // RAF-throttled content update — prevents React render thrashing
    let pendingContent = "";
    let rafId: number | null = null;
    const scheduleUpdate = () => {
      if (rafId !== null) return; // already scheduled
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (onContentChunk && pendingContent) {
          onContentChunk("answer", pendingContent);
        }
      });
    };

    try {
      for await (const event of callChatApiStream(prompt, conversationId, pdfs)) {
        switch (event.type) {
          case "token":
            // Track initial vs final phase separately
            if (event.content) {
              if (event.phase === "initial") {
                initialContent += event.content;
              } else if (event.phase === "final") {
                finalContent += event.content;
              }
              // Combine both phases for display
              pendingContent = initialContent + finalContent;
              scheduleUpdate();
            }
            break;
          case "tool_start":
            onIndicator(`Using ${event.tool_name}...`);
            break;
          case "tool_end":
            onIndicator(`${event.tool_name} completed`);
            break;
          case "done":
            // Backend now sends combined answer (initial + final), use it directly
            if (event.answer) {
              finalContent = event.answer;
              pendingContent = finalContent;
              // Update display with combined answer
              if (rafId !== null) cancelAnimationFrame(rafId);
              if (onContentChunk) onContentChunk("answer", finalContent);
            }
            toolsUsed = event.tools_used?.map((t) => t.tool) ?? [];
            break;
          case "conversation_id":
            backendConversationId = event.conversation_id;
            break;
          case "error":
            throw new Error(event.message || "Unknown error");
        }
      }
    } finally {
      if (rafId !== null) cancelAnimationFrame(rafId);
      onIndicator("");
    }

    return {
      content: finalContent || "No response received.",
      meta: {
        confidenceScore: 85,
        reasoningDepth: 2,
        retryCount: 0,
        toolsUsed,
      },
      conversation_id: backendConversationId,
    };
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

    // For standard path via smart orchestrator: incremental accumulation + RAF
    let standardContent = "";
    let standardRafId: number | null = null;
    const scheduleStandardUpdate = () => {
      if (standardRafId !== null) return;
      standardRafId = requestAnimationFrame(() => {
        standardRafId = null;
        if (onContentChunk) onContentChunk("answer", standardContent);
      });
    };

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
          case "content_chunk":
            // Standard path streaming tokens via smart orchestrator — incremental
            // Also handle if path not yet detected (race condition protection)
            if ((detectedPath === "standard" || detectedPath === null) && event.content) {
              standardContent += event.content;
              scheduleStandardUpdate();
            }
            // Deep research: forward section-specific content chunks
            if (detectedPath === "deep_research" && event.section && event.content) {
              if (onContentChunk) {
                onContentChunk(event.section, event.content);
              }
            }
            break;
          case "tool_start":
            if (detectedPath === "standard") {
              onIndicator(`Using ${event.tool_name}...`);
            }
            break;
          case "tool_end":
            if (detectedPath === "standard") {
              onIndicator(`${event.tool_name} completed`);
            }
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
      if (standardRafId !== null) cancelAnimationFrame(standardRafId);
      // Final flush for standard path content
      if (detectedPath === "standard" && standardContent && onContentChunk) {
        onContentChunk("answer", standardContent);
      }
      onIndicator("");
    }

    // Use standardContent as fallback if finalResult is empty (can happen with standard path)
    const finalContent = finalResult || standardContent || "No response received.";
    
    return {
      content: finalContent,
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

  // Capture what_happened from content_chunk events
  let whatHappened: { decomposition: string; researcher1: string; researcher2: string } = {
    decomposition: "",
    researcher1: "",
    researcher2: "",
  };

  const handleContentChunk = (section: string, content: string) => {
    if (section === "decomposition") {
      whatHappened.decomposition = content;
    } else if (section === "researcher_1") {
      whatHappened.researcher1 = content;
    } else if (section === "researcher_2") {
      whatHappened.researcher2 = content;
    }
    if (onContentChunk) {
      onContentChunk(section, content);
    }
  };

  try {
    let result = await callOrchestratorApi(prompt, (log) => onIndicator(log), conversationId, pdfs, onNodeUpdate, handleContentChunk);
    if (result.orchestratorRaw) {
      result = {
        ...result,
        content: result.orchestratorRaw.final_result,
      };
    }
    // Include what_happened if we have decomposition
    if (whatHappened.decomposition) {
      result = {
        ...result,
        whatHappened,
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
