import { useState } from 'react';
import type { MessageRelatedEntity } from '../../lib/api';

/** /mesajlar sayfasindaki filtre cekmecesi ile sag-alt mesajlasma widget'inin filtre
 * cekmecesi tek kaynaktan (bkz. messages-filter-drawer.tsx) beslenir - bu hook o ortak
 * state'i tutar, her iki tuketici de kendi `useMessagesQuery` cagrisinda `queryParams`'i
 * kullanir. */
export function useMessagesFilterState() {
  const [relatedEntity, setRelatedEntity] = useState<MessageRelatedEntity[]>([]);
  const [quoteIds, setQuoteIds] = useState<string[]>([]);
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [interactionIds, setInteractionIds] = useState<string[]>([]);
  const [recipientUserId, setRecipientUserId] = useState<string | undefined>(undefined);
  const [isMeetingReport, setIsMeetingReport] = useState(false);

  function reset() {
    setRelatedEntity([]);
    setQuoteIds([]);
    setProjectIds([]);
    setInteractionIds([]);
    setRecipientUserId(undefined);
    setIsMeetingReport(false);
  }

  return {
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
    isMeetingReport,
    setIsMeetingReport,
    reset,
    queryParams: {
      relatedEntity: relatedEntity.length ? relatedEntity : undefined,
      quoteIds: quoteIds.length ? quoteIds : undefined,
      projectIds: projectIds.length ? projectIds : undefined,
      interactionIds: interactionIds.length ? interactionIds : undefined,
      recipientUserId,
      isMeetingReport: isMeetingReport || undefined,
    },
  };
}

export type MessagesFilterState = ReturnType<typeof useMessagesFilterState>;
