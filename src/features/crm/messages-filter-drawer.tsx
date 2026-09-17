import { Button } from '../../components/ui/button';
import { Drawer } from '../../components/ui/drawer';
import { MultiSelect } from '../../components/ui/multi-select';
import { Select } from '../../components/ui/select';
import { useInteractionsQuery } from './use-interactions';
import { useAssignableMessageUsersQuery } from './use-messages';
import type { MessagesFilterState } from './use-messages-filter-state';
import { useProjectsQuery } from './use-projects';
import { useQuotesQuery } from './use-quotes';
import type { MessageRelatedEntity } from '../../lib/api';
import { tr } from '../../i18n/tr';

interface MessagesFilterDrawerProps {
  filters: MessagesFilterState;
  onClose: () => void;
}

/** /mesajlar sayfasi ve sag-alt mesajlasma widget'i icin TEK filtre cekmecesi kaynagi -
 * ikisi de bu bileseni ayni `useMessagesFilterState` state'iyle render eder. */
export function MessagesFilterDrawer({ filters, onClose }: MessagesFilterDrawerProps) {
  const usersQuery = useAssignableMessageUsersQuery();
  const quotesQuery = useQuotesQuery();
  const projectsQuery = useProjectsQuery();
  const interactionsQuery = useInteractionsQuery();

  const quoteOptions = (quotesQuery.data?.data ?? []).map((quote) => ({
    value: quote.id,
    label: `${quote.quoteNumber} — ${quote.account.name}`,
  }));
  const projectOptions = (projectsQuery.data?.data ?? []).map((project) => ({
    value: project.id,
    label: `${project.projectNumber} — ${project.name}`,
  }));
  const interactionOptions = (interactionsQuery.data?.data ?? []).map((interaction) => ({
    value: interaction.id,
    label: `${interaction.account?.name ?? tr.crm.interactions.detail.noAccountFallback} — ${tr.crm.interactions.typeOptions[interaction.type]} (${new Date(interaction.occurredAt).toLocaleDateString('tr-TR')})`,
  }));

  return (
    <Drawer title={tr.crm.messages.filterDrawer.title} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <Select
          label={tr.crm.messages.filterDrawer.boxLabel}
          value={filters.box ?? ''}
          onChange={(event) =>
            filters.setBox((event.target.value || undefined) as 'inbox' | 'sent' | undefined)
          }
          options={[
            { value: 'inbox', label: tr.crm.messages.filterDrawer.boxInboxOption },
            { value: 'sent', label: tr.crm.messages.filterDrawer.boxSentOption },
          ]}
          placeholder={tr.crm.messages.filterDrawer.boxAllOption}
        />
        <MultiSelect
          label={tr.crm.messages.filterDrawer.relatedEntityLabel}
          value={filters.relatedEntity}
          onChange={(value) => filters.setRelatedEntity(value as MessageRelatedEntity[])}
          options={Object.entries(tr.crm.messages.relatedEntityOptions).map(([value, label]) => ({
            value,
            label,
          }))}
          placeholder={tr.crm.messages.filterDrawer.relatedEntityAllOption}
        />
        <MultiSelect
          label={tr.crm.messages.filterDrawer.quoteLabel}
          value={filters.quoteIds}
          onChange={filters.setQuoteIds}
          options={quoteOptions}
          placeholder={tr.crm.messages.filterDrawer.quoteAllOption}
        />
        <MultiSelect
          label={tr.crm.messages.filterDrawer.projectLabel}
          value={filters.projectIds}
          onChange={filters.setProjectIds}
          options={projectOptions}
          placeholder={tr.crm.messages.filterDrawer.projectAllOption}
        />
        <MultiSelect
          label={tr.crm.messages.filterDrawer.interactionLabel}
          value={filters.interactionIds}
          onChange={filters.setInteractionIds}
          options={interactionOptions}
          placeholder={tr.crm.messages.filterDrawer.interactionAllOption}
        />
        <Select
          id="messages-filter-recipient"
          label={tr.crm.messages.filterDrawer.recipientLabel}
          value={filters.recipientUserId ?? ''}
          onChange={(event) => filters.setRecipientUserId(event.target.value || undefined)}
          options={(usersQuery.data ?? []).map((user) => ({ value: user.id, label: user.name }))}
          placeholder={tr.crm.messages.filterDrawer.recipientAllOption}
        />
        <Button type="button" variant="secondary" onClick={filters.reset}>
          {tr.crm.messages.filterDrawer.reset}
        </Button>
      </div>
    </Drawer>
  );
}
