import { count } from "console";
import { ChatMode } from "./store";

const SYSTEM_INDICATORS: Record<ChatMode, string[]> = {
  standard: ["Analyzing input…", "Reasoning…", "Formulating response…"],
  "multi-agent": [
    "Orchestrator activated…",
    "Spawning specialized agents…",
    "Planner agent reasoning…",
    "Executor agent processing…",
    "Aggregating results…",
  ],
  "deep-research": [
    "Decomposing task…",
    "Executing tools…",
    "Identifying research vectors…",
    "Researching sources…",
    "Synthesizing findings…",
    "Verifying facts…",
  ],
};

const MOCK_RESPONSES: Record<ChatMode, string[]> = {
  standard: [
    "Based on my analysis, the concept you're exploring touches on several interconnected domains. The core principle involves a recursive self-improvement loop where each iteration refines the underlying model's representational capacity. This approach has shown promising results in recent literature, particularly when combined with structured reasoning chains.",
    "The question you've raised is fundamentally about emergent behavior in complex systems. When individual components follow simple rules, global patterns arise that cannot be predicted from the components alone. This is the essence of multi-scale reasoning — understanding phenomena at multiple levels of abstraction simultaneously.",
    "I've considered your query from multiple angles. The most robust explanation centers on the interplay between symbolic and sub-symbolic processing. While neural systems excel at pattern recognition, explicit symbolic reasoning allows for compositionality and systematic generalization — two capabilities that remain challenging for purely statistical approaches.",
  ],
  "multi-agent": [
    "**Orchestrator Summary**: I deployed 3 specialized agents for this task.\n\n**Planner Agent**: Decomposed the problem into 4 subtasks — context retrieval, hypothesis generation, validation, and synthesis.\n\n**Research Agent**: Identified 7 relevant knowledge clusters with high semantic similarity to your query.\n\n**Critic Agent**: Evaluated 3 candidate answers, flagged 1 for logical inconsistency, and selected the highest-confidence response.\n\n**Final Answer**: The system achieves superior performance through specialization — each agent focuses on what it does best, reducing cognitive load and improving accuracy across complex reasoning chains.",
    "**Multi-Agent Analysis Complete**\n\nAgent 1 (Context): Retrieved 12 relevant precedents from memory.\nAgent 2 (Reasoner): Applied 3 reasoning frameworks — deductive, abductive, and analogical.\nAgent 3 (Verifier): Cross-checked claims against known facts.\n\nConsensus reached across all agents. Confidence: 94%.\n\nThe answer emerges from the intersection of all three perspectives: the phenomenon you describe is best understood as a phase transition in information processing capacity — a qualitative shift that emerges when quantitative thresholds are crossed.",
  ],
  "deep-research": [
    "**Deep Research Report**\n\n**Task Decomposition**: 6 subtasks identified and processed in parallel.\n\n**Research Summary**:\n- Source cluster 1: Foundational papers on the topic (high relevance)\n- Source cluster 2: Recent empirical studies (moderate relevance)\n- Source cluster 3: Competing theoretical frameworks (evaluative)\n\n**Tools Used**: Semantic search, knowledge graph traversal, cross-reference validation\n\n**Synthesis**: The evidence strongly supports a multi-causal explanation. No single factor accounts for the observed phenomenon. The interaction effects between variables X and Y produce emergent behavior that exceeds additive predictions.\n\n**Confidence**: 89% | **Uncertainty Regions**: Causal direction between variables A and B remains ambiguous.",
  ],
};

export async function mockGenerateResponse(
  prompt: string,
  mode: ChatMode,
  onIndicator: (indicator: string) => void
): Promise<{
  content: string;
  meta: {
    confidenceScore: number;
    reasoningDepth: number;
    retryCount: number;
    toolsUsed: string[];
  };
}> {
  const indicators = SYSTEM_INDICATORS[mode];
  const responses = MOCK_RESPONSES[mode];

  for (const indicator of indicators) {
    onIndicator(indicator);
    await new Promise((r) => setTimeout(r, 600 + Math.random() * 400));
  }

  onIndicator("");

  const content = responses[Math.floor(Math.random() * responses.length)];
  const confidenceScore = 75 + Math.floor(Math.random() * 22);
  const reasoningDepth =
    mode === "standard" ? 2 : mode === "multi-agent" ? 4 : 6;
  const retryCount = Math.random() > 0.8 ? 1 : 0;
  const toolsUsed =
    mode === "deep-research"
      ? ["SemanticSearch", "KnowledgeGraph", "CrossRefValidator"]
      : mode === "multi-agent"
      ? ["OrchestratorAPI", "AgentPool"]
      : [];

  return { content, meta: { confidenceScore, reasoningDepth, retryCount, toolsUsed } };
}

export async function mockDebateResponse(
  topic: string,
  round: number,
  role: "proposer" | "critic"
): Promise<string> {
  await new Promise((r) => setTimeout(r, 800 + Math.random() * 600));

  const proposerReplies = [
    `**Round ${round} — Proposer**: The evidence overwhelmingly supports this position. Three independent studies confirm the causal mechanism, and the logical structure of the argument is airtight. The critic's objections fail to account for contextual moderating variables that fundamentally change the inference. When we control for confounds, the original claim stands with even greater force.`,
    `**Round ${round} — Proposer**: I maintain my position. The critic has raised valid concerns about sample size, but the effect size remains significant even under conservative statistical assumptions. Furthermore, the theoretical grounding predicts exactly this outcome from first principles — we don't require large samples when the causal model is well-specified.`,
    `**Round ${round} — Proposer**: The logical chain is sound: if P then Q, P is established, therefore Q follows. The critic challenges the truth of P, but the evidence base for P includes convergent validation from multiple independent measurement approaches. This is not a single-source claim.`,
  ];

  const criticReplies = [
    `**Round ${round} — Critic**: The proposer's argument contains a critical gap. The studies cited use correlational designs that cannot establish causation. Furthermore, the contextual variables mentioned are precisely what I'm calling into question — they weren't controlled for in the primary studies. The conclusion is premature given the current evidentiary standard.`,
    `**Round ${round} — Critic**: I identify a logical inconsistency in the proposer's claim. The effect described requires mechanism M, but the evidence for M is indirect at best. Alternative mechanisms could produce identical observations. Without ruling out alternatives, the specific causal claim remains unwarranted.`,
    `**Round ${round} — Critic**: The proposer conflates statistical significance with practical effect size. Even if the relationship is real, the magnitude is insufficient to support the strong version of the claim. The conclusion needs to be appropriately hedged to reflect genuine uncertainty in the literature.`,
  ];

  if (role === "proposer") return proposerReplies[round % proposerReplies.length];
  return criticReplies[round % criticReplies.length];
}

export const TASK_GRAPH_DATA = {
  nodes: [
    {
      id: "orchestrator",
      type: "orchestrator",
      label: "Orchestrator",
      description: "Coordinates all agents and manages task flow",
      status: "completed" as const,
      timeTaken: "1.2s",
      x: 400,
      y: 60,
    },
    {
      id: "decomposer",
      type: "decomposer",
      label: "Decomposer",
      description: "Breaks the main task into subtasks",
      status: "completed" as const,
      timeTaken: "0.8s",
      x: 400,
      y: 160,
    },
    {
      id: "subtask1",
      type: "subtask",
      label: "Context Retrieval",
      description: "Retrieves relevant context from memory store",
      status: "completed" as const,
      timeTaken: "1.4s",
      x: 160,
      y: 280,
    },
    {
      id: "subtask2",
      type: "subtask",
      label: "Hypothesis Gen",
      description: "Generates candidate hypotheses",
      status: "completed" as const,
      timeTaken: "0.9s",
      x: 400,
      y: 280,
    },
    {
      id: "subtask3",
      type: "subtask",
      label: "Validation",
      description: "Validates hypotheses against evidence",
      status: "retried" as const,
      timeTaken: "2.1s",
      x: 640,
      y: 280,
    },
    {
      id: "agent1",
      type: "agent",
      label: "Research Agent",
      description: "Performs semantic search and retrieval",
      status: "completed" as const,
      timeTaken: "1.8s",
      x: 160,
      y: 400,
    },
    {
      id: "agent2",
      type: "agent",
      label: "Reasoning Agent",
      description: "Applies logical inference chains",
      status: "completed" as const,
      timeTaken: "1.3s",
      x: 400,
      y: 400,
    },
    {
      id: "tool1",
      type: "tool",
      label: "SemanticSearch",
      description: "Vector similarity search over knowledge base",
      status: "completed" as const,
      timeTaken: "0.6s",
      x: 80,
      y: 520,
    },
    {
      id: "tool2",
      type: "tool",
      label: "KnowledgeGraph",
      description: "Graph traversal for related concepts",
      status: "completed" as const,
      timeTaken: "0.4s",
      x: 240,
      y: 520,
    },
    {
      id: "output",
      type: "output",
      label: "Final Output",
      description: "Synthesized response with confidence scoring",
      status: "completed" as const,
      timeTaken: "0.3s",
      x: 400,
      y: 520,
    },
  ],
  edges: [
    { from: "orchestrator", to: "decomposer" },
    { from: "decomposer", to: "subtask1" },
    { from: "decomposer", to: "subtask2" },
    { from: "decomposer", to: "subtask3" },
    { from: "subtask1", to: "agent1" },
    { from: "subtask2", to: "agent2" },
    { from: "agent1", to: "tool1" },
    { from: "agent1", to: "tool2" },
    { from: "subtask2", to: "output" },
    { from: "subtask3", to: "output" },
  ],
};

export const MEMORY_DATA = {
  pastTasks: [
    {
      id: "m1",
      title: "Quantum Computing Primer",
      summary: "Explained superposition and entanglement principles",
      similarity: 0.94,
      timestamp: "2 hours ago",
      cluster: "Physics",
      influenced: true,
    },
    {
      id: "m2",
      title: "Neural Architecture Search",
      summary: "AutoML techniques for model architecture optimization",
      similarity: 0.87,
      timestamp: "1 day ago",
      cluster: "ML Research",
      influenced: true,
    },
    {
      id: "m3",
      title: "Causal Inference Methods",
      summary: "Do-calculus and counterfactual reasoning frameworks",
      similarity: 0.81,
      timestamp: "3 days ago",
      cluster: "Statistics",
      influenced: false,
    },
    {
      id: "m4",
      title: "Attention Mechanism Deep Dive",
      summary: "Transformer architecture and scaled dot-product attention",
      similarity: 0.76,
      timestamp: "5 days ago",
      cluster: "ML Research",
      influenced: false,
    },
    {
      id: "m5",
      title: "Knowledge Graph Construction",
      summary: "Entity extraction and relation classification pipelines",
      similarity: 0.71,
      timestamp: "1 week ago",
      cluster: "Knowledge Systems",
      influenced: true,
    },
    {
      id: "m6",
      title: "Bayesian Reasoning",
      summary: "Prior and posterior probability in belief updating",
      similarity: 0.65,
      timestamp: "2 weeks ago",
      cluster: "Statistics",
      influenced: false,
    },
  ],
  clusters: [
    { id: "c1", label: "ML Research", count: 12, x: 120, y: 120 },
    { id: "c2", label: "Statistics", count: 8, x: 280, y: 80 },
    { id: "c3", label: "Physics", count: 5, x: 200, y: 180 },
    { id: "c4", label: "Knowledge Systems", count: 9, x: 340, y: 180 },
    { id: "c5", label: "Deep Learning", count: 18, x: 260, y: 260 },
    { id: "c6", label: "Reasoning", count: 7, x: 100, y: 260 },
  ],
  timeline: [
    { month: "Sep", quality: 62 },
    { month: "Oct", quality: 68 },
    { month: "Nov", quality: 71 },
    { month: "Dec", quality: 75 },
    { month: "Jan", quality: 82 },
    { month: "Feb", quality: 88 },
    { month: "Mar", quality: 93 },
  ],
};

export const REFLECTION_DATA = {
  scores: {
    confidenceScore: 87,
    logicalConsistency: 91,
    factualReliability: 84,
    selfCorrectionTriggered: true,
  },
  radarData: [
    { metric: "Planning", value: 88 },
    { metric: "Reasoning", value: 92 },
    { metric: "Verification", value: 85 },
    { metric: "Adaptation", value: 79 },
    { metric: "Confidence", value: 87 },
  ],
  issues: [
    {
      id: "r1",
      issue: "Weak evidence support detected",
      improvement: "Increased validation threshold to 0.85",
      strategy: "Tool-based verification first on all empirical claims",
      severity: "medium" as const,
    },
    {
      id: "r2",
      issue: "Circular reasoning pattern identified",
      improvement: "Introduced external reference anchoring",
      strategy: "Cross-validate with independent knowledge sources",
      severity: "high" as const,
    },
    {
      id: "r3",
      issue: "Overconfidence in novel domain",
      improvement: "Applied epistemic humility modifier",
      strategy: "Flag low-confidence responses for human review",
      severity: "low" as const,
    },
  ],
};
