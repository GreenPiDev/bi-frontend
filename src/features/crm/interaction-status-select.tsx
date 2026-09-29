import { clsx } from 'clsx';
import { InlineSelect } from '../../components/ui/inline-select';
import { useToast } from '../../components/ui/toast-context';
import { useUpdateInteractionMutation } from './use-interactions';
import { ApiError, type Interaction } from '../../lib/api';
import { tr } from '../../i18n/tr';

export function InteractionStatusSelect({ interaction }: { interaction: Interaction }) {
  const toast = useToast();
  const updateMutation = useUpdateInteractionMutation(interaction.id);

  return (
    <InlineSelect
      value={interaction.status}
      options={[
        { value: 'OPEN', label: tr.crm.interactions.statusOptions.OPEN },
        { value: 'CLOSED', label: tr.crm.interactions.statusOptions.CLOSED },
      ]}
      disabled={updateMutation.isPending}
      selectClassName={clsx(
        'font-semibold disabled:opacity-50',
        interaction.status === 'OPEN' ? 'text-app-success' : 'text-app-danger',
      )}
      onChange={(value) => {
        const status = value as Interaction['status'];
        updateMutation.mutate(
          { status },
          {
            onSuccess: () => toast.success(tr.crm.interactions.statusUpdateSuccess),
            onError: (error) => {
              toast.error(
                error instanceof ApiError ? error.message : tr.crm.interactions.statusUpdateError,
              );
            },
          },
        );
      }}
    />
  );
}
