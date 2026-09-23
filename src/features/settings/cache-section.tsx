import { useMutation } from '@tanstack/react-query';
import { Button } from '../../components/ui/button';
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
    <section className="border-t border-app-border p-4">
      <div className="mb-4">
        <h2 className="text-base font-bold text-app-text">{tr.settings.cache.title}</h2>
        <p className="text-sm text-app-muted">{tr.settings.cache.hint}</p>
      </div>
      <Button
        type="button"
        variant="secondary"
        disabled={clearMutation.isPending}
        onClick={() => clearMutation.mutate()}
      >
        {clearMutation.isPending ? tr.settings.cache.clearing : tr.settings.cache.clearButton}
      </Button>
    </section>
  );
}
