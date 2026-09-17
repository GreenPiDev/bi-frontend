import type { MessageRelatedEntity } from '../../lib/api';

/** Bir mesajin `relatedEntity` alanindan gercek uygulama rotasina giden yol -
 * new-message-modal, message-compose-form, message-detail-page ve
 * messaging-chat-panel arasinda paylasilir, tek kaynaktan yonetilir. */
export const RELATED_ENTITY_PATH: Record<MessageRelatedEntity, string> = {
  PROJECT: '/projeler',
  QUOTE: '/teklifler',
  INTERACTION: '/gorusmeler',
};

export function getRelatedEntityDetailPath(
  relatedEntity: MessageRelatedEntity | null | undefined,
  relatedEntityId: string | null | undefined,
): string | undefined {
  if (!relatedEntity || !relatedEntityId) return undefined;
  return `${RELATED_ENTITY_PATH[relatedEntity]}/${relatedEntityId}`;
}
