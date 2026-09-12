import { A2UIMessageProcessor, type A2UIProcessResult } from '../a2ui/message-processor.ts';
import { A2UI_VERSION, type A2UIMessage } from '../a2ui/types.ts';

/** HTTP chat replies can recreate surfaces; the core A2UI stream stays strict. */
export class AssistantResponseProcessor {
  private processor = new A2UIMessageProcessor();

  process(messages: readonly A2UIMessage[] | null, newQuery: boolean): A2UIProcessResult {
    const candidate = newQuery ? new A2UIMessageProcessor() : this.processor;
    if (messages === null) {
      this.processor = candidate;
      return { ok: true, surfaces: candidate.snapshot() };
    }

    // An action may return a complete replacement instead of an incremental update.
    // Delete only previously existing surfaces, atomically with the new payload.
    const existing = new Set(candidate.snapshot().map((surface) => surface.surfaceId));
    const recreated = new Set(messages.flatMap((message) =>
      'createSurface' in message && existing.has(message.createSurface.surfaceId)
        ? [message.createSurface.surfaceId]
        : [],
    ));
    const deletions: A2UIMessage[] = [...recreated].map((surfaceId) => ({
      version: A2UI_VERSION,
      deleteSurface: { surfaceId },
    }));
    const result = candidate.process([...deletions, ...messages]);
    if (result.ok) this.processor = candidate;
    return result;
  }
}
