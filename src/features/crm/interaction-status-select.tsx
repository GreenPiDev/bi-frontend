import { clsx } from 'clsx';
import { useToast } from '../../components/ui/toast-context';
import { useUpdateInteractionMutation } from './use-interactions';
import { ApiError, type Interaction } from '../../lib/api';
import { tr } from '../../i18n/tr';

export function InteractionStatusSelect({ interaction }: { interaction: Interaction }) {
  const toast = useToast();
  const updateMutation = useUpdateInteractionMutation(interaction.id);

  return (
    <select
      value={interaction.status}
      onClick={(event) => event.stopPropagation()}
      onChange={(event) => {
        const status = event.target.value as Interaction['status'];
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
      disabled={updateMutation.isPending}
      className={clsx(
        'cursor-pointer rounded-md border-none bg-transparent px-2 py-1 -mx-2 -my-1 text-sm font-semibold outline-none transition-colors hover:bg-[#1a2440] hover:text-white focus:ring-2 focus:ring-app-primary disabled:cursor-not-allowed disabled:opacity-50',
        interaction.status === 'OPEN' ? 'text-app-success' : 'text-app-danger',
      )}
    >
      <option value="OPEN">{tr.crm.interactions.statusOptions.OPEN}</option>
      <option value="CLOSED">{tr.crm.interactions.statusOptions.CLOSED}</option>
    </select>
  );
}
