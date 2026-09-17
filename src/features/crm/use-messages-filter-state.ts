import { useState } from 'react';
import type { MessageRelatedEntity } from '../../lib/api';

/** /mesajlar sayfasindaki filtre cekmecesi ile sag-alt mesajlasma widget'inin filtre
 * cekmecesi tek kaynaktan (bkz. messages-filter-drawer.tsx) beslenir - bu hook o ortak
 * state'i tutar, her iki tuketici de kendi `useMessagesQuery` cagrisinda `queryParams`'i
 * kullanir. */
export function useMessagesFilterState() {
  const [box, setBox] = useState<'inbox' | 'sent' | undefined>(undefined);
  const [relatedEntity, setRelatedEntity] = useState<MessageRelatedEntity[]>([]);
  const [quoteIds, setQuoteIds] = useState<string[]>([]);
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [interactionIds, setInteractionIds] = useState<string[]>([]);
  const [recipientUserId, setRecipientUserId] = useState<string | undefined>(undefined);

  function reset() {
    setBox(undefined);
    setRelatedEntity([]);
    setQuoteIds([]);
    setProjectIds([]);
    setInteractionIds([]);
    setRecipientUserId(undefined);
  }

  return {
    box,
    setBox,
    relatedEntity,
    setRelatedEntity,
    quoteIds,
    setQuoteIds,
    projectIds,
    setProjectIds,
    interactionIds,
    setInteractionIds,
    recipientUserId,
    setRecipientUserId,
    reset,
    queryParams: {
      box,
      relatedEntity: relatedEntity.length ? relatedEntity : undefined,
      quoteIds: quoteIds.length ? quoteIds : undefined,
      projectIds: projectIds.length ? projectIds : undefined,
      interactionIds: interactionIds.length ? interactionIds : undefined,
      recipientUserId,
    },
  };
}

export type MessagesFilterState = ReturnType<typeof useMessagesFilterState>;
