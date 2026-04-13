import { CodeCompleteMarker, CodePreThinking, DeepResearchPreThinking, MessagePreThinking } from '@/lib/api';

export const hasNonEmptyText = (value: string | undefined): value is string =>
  typeof value === 'string' && value.trim().length > 0;

export function isCodeCompleteMarker(marker: unknown): marker is CodeCompleteMarker {
  if (!marker || typeof marker !== 'object') return false;
  const candidate = marker as Partial<CodeCompleteMarker>;
  return (
    candidate.type === 'code_complete' &&
    typeof candidate.file_count === 'number' &&
    Array.isArray(candidate.filenames) &&
    candidate.filenames.every((name) => typeof name === 'string')
  );
}

export function isCodePreThinking(preThinking: MessagePreThinking | null): preThinking is CodePreThinking {
  if (!preThinking || typeof preThinking !== 'object') return false;
  const candidate = preThinking as CodePreThinking;
  return (
    candidate.route_path === 'code' ||
    hasNonEmptyText(candidate.problem_understanding) ||
    hasNonEmptyText(candidate.approach) ||
    (Array.isArray(candidate.agent_outputs) && candidate.agent_outputs.length > 0) ||
    (Array.isArray(candidate.file_outputs) && candidate.file_outputs.length > 0) ||
    isCodeCompleteMarker(candidate.final_marker)
  );
}

export function isDeepResearchPreThinking(
  preThinking: MessagePreThinking | null
): preThinking is DeepResearchPreThinking {
  if (!preThinking || typeof preThinking !== 'object') return false;
  const candidate = preThinking as DeepResearchPreThinking;
  return (
    hasNonEmptyText(candidate.decomposition) ||
    hasNonEmptyText(candidate.researcher1) ||
    hasNonEmptyText(candidate.researcher2)
  );
}
