/** Ask the future self: backend first, offline fallback when the server is unreachable or has no key. */
import { offlineReply, type ChatReply, type Snapshot, type ChatMessage } from '../../engine';
import { ChatServerError, sendChat } from './api';

export interface AskResult extends ChatReply {
  fallbackReason?: string;
}

export async function askFutureSelf(snapshot: Snapshot, messages: ChatMessage[], alertContext?: string): Promise<AskResult> {
  try {
    const reply = await sendChat({ snapshot, messages, alertContext });
    return reply;
  } catch (err) {
    const reason = err instanceof ChatServerError ? err.message : 'Server niet bereikbaar';
    const offline = offlineReply(snapshot, messages, alertContext);
    return { ...offline, fallbackReason: reason };
  }
}
