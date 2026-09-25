import { useMutation } from '@tanstack/react-query';
import { Button } from '../../components/ui/button';
import { CollapsibleSection } from '../../components/ui/collapsible-section';
import { useToast } from '../../components/ui/toast-context';
import { ApiError, clearCache } from '../../lib/api';
import { tr } from '../../i18n/tr';

export function CacheSection() {
  const toast = useToast();
  const clearMutation = useMutation({
    mutationFn: clearCache,
    onSuccess: () => toast.success(tr.settings.cache.success),
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : tr.settings.cache.error);
    },
  });

  return (
    <CollapsibleSection title={tr.settings.cache.title} subtitle={tr.settings.cache.hint}>
      <Button
        type="button"
        variant="secondary"
        disabled={clearMutation.isPending}
        onClick={() => clearMutation.mutate()}
      >
        {clearMutation.isPending ? tr.settings.cache.clearing : tr.settings.cache.clearButton}
      </Button>
    </CollapsibleSection>
  );
}
