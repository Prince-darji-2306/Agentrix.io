/**
 * SSE Event Parser: Unified parser for SSE events
 * Reduces redundant try/catch logic scattered in generateResponse
 */

export interface SmartSSEEvent {
  type: string;
  [key: string]: any;
}

export interface ChatStreamEvent {
  type: string;
  [key: string]: any;
}

export class SseEventParser {
  /**
   * Parse a single SSE event line
   * Format: "data: {...json...}"
   */
  static parseSmartSSEEvent(line: string): SmartSSEEvent | null {
    return SseEventParser.parseSseLine<SmartSSEEvent>(line);
  }

  /**
   * Parse chat stream event
   */
  static parseChatStreamEvent(line: string): ChatStreamEvent | null {
    return SseEventParser.parseSseLine<ChatStreamEvent>(line);
  }

  /**
   * Generic SSE line parser
   */
  private static parseSseLine<T>(line: string): T | null {
    try {
      if (!line || !line.startsWith('data:')) return null;

      const jsonStr = line.slice(5).trim();
      if (!jsonStr) return null;

      return JSON.parse(jsonStr) as T;
    } catch (e) {
      console.debug('[SseEventParser] Failed to parse event:', line, e);
      return null;
    }
  }

  /**
   * Process SmartSSE event by type
   * Returns normalized event or null if no handler
   */
  static processSmartEvent(event: SmartSSEEvent): SmartSSEEvent | null {
    if (!event || !event.type) return null;

    switch (event.type) {
      case 'route':
      case 'stage':
      case 'node_update':
      case 'plan':
      case 'code_section':
      case 'file_output':
      case 'agent_output':
      case 'final':
      case 'done':
      case 'error':
        return event;
      default:
        return null;
    }
  }

  /**
   * Process ChatStream event by type
   */
  static processChatEvent(event: ChatStreamEvent): ChatStreamEvent | null {
    if (!event || !event.type) return null;

    switch (event.type) {
      case 'token':
      case 'tool_start':
      case 'tool_end':
      case 'conversation_id':
      case 'done':
      case 'error':
        return event;
      default:
        return null;
    }
  }
}
