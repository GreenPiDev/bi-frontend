import { useNavigate } from 'react-router-dom';
import { QuoteContentBody } from './quote-detail-page';
import { Badge } from '../components/ui/badge';
import { Modal } from '../components/ui/modal';
import { useQuoteQuery } from '../features/crm/use-quotes';
import type { QuoteStatus } from '../lib/api';
import { tr } from '../i18n/tr';

const STATUS_BADGE_VARIANT: Record<
  QuoteStatus,
  'success' | 'warning' | 'danger' | 'neutral' | 'orange'
> = {
  UNSPECIFIED: 'neutral',
  DRAFT: 'neutral',
  PENDING_APPROVAL: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
  REVIZE: 'orange',
};

export function QuoteViewModal({ quoteId, onClose }: { quoteId: string; onClose: () => void }) {
  const navigate = useNavigate();
  const quoteQuery = useQuoteQuery(quoteId);
  const quote = quoteQuery.data;

  return (
    <Modal
      title={quote ? quote.quoteNumber : tr.common.loading}
      subtitle={
        quote
          ? quote.account.name +
            (quote.contact ? ` · ${quote.contact.firstName} ${quote.contact.lastName}` : '')
          : undefined
      }
      onClose={onClose}
      width="xl"
    >
      {!quote ? (
        <p className="text-sm text-app-muted">{tr.common.loading}</p>
      ) : (
        <>
          <Badge variant={STATUS_BADGE_VARIANT[quote.status]}>
            {tr.crm.quotes.statusOptions[quote.status]}
          </Badge>
          <div className="mt-4">
            <QuoteContentBody
              quote={quote}
              onOpportunityClick={(opportunityId) => {
                onClose();
                navigate(`/firsatlar/${opportunityId}`);
              }}
            />
          </div>
        </>
      )}
    </Modal>
  );
}
