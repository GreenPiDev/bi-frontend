import { Copy, ExternalLink, Link2Off } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { CircleIconButton } from '../../components/ui/circle-icon-button';
import { ConfirmModal } from '../../components/ui/confirm-modal';
import { Modal } from '../../components/ui/modal';
import { Select } from '../../components/ui/select';
import { useToast } from '../../components/ui/toast-context';
import { tr } from '../../i18n/tr';
import { copyToClipboard } from '../../lib/copy-to-clipboard';
import {
  ApiError,
  type ShareExpiryDays,
  type ShareLink,
  type ShareResourceKind,
} from '../../lib/api';
import {
  useCreateShareLinkMutation,
  useRevokeShareLinkMutation,
  useShareLinksQuery,
} from './use-share-links';

const EXPIRY_VALUES = ['7', '30', '90', 'never'] as const;
type ExpiryValue = (typeof EXPIRY_VALUES)[number];

const dateTimeFormatter = new Intl.DateTimeFormat('tr-TR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

function toExpiryDays(value: ExpiryValue): ShareExpiryDays {
  return value === 'never' ? null : (Number(value) as 7 | 30 | 90);
}

function statusBadge(link: ShareLink) {
  if (link.revokedAt) return <Badge variant="danger">{tr.shares.statusRevoked}</Badge>;
  if (!link.isActive) return <Badge variant="warning">{tr.shares.statusExpired}</Badge>;
  return <Badge variant="success">{tr.shares.statusActive}</Badge>;
}

interface ShareLinkModalProps {
  kind: ShareResourceKind;
  resourceId: string;
  onClose: () => void;
}

/**
 * Merkezi paylasim linki modali (bkz. docs/VARSAYIMLAR.md V87) - kaynaktan
 * bagimsiz; yeni bir sayfaya paylasim eklemek icin sadece `kind`+`resourceId`
 * verilir (backend'de o kaynak icin `/shares/<kind>/:id` ucu olmali).
 */
export function ShareLinkModal({ kind, resourceId, onClose }: ShareLinkModalProps) {
  const toast = useToast();
  const [expiry, setExpiry] = useState<ExpiryValue>('30');
  const [revokeTarget, setRevokeTarget] = useState<ShareLink | null>(null);
  const linksQuery = useShareLinksQuery(kind, resourceId);
  const createMutation = useCreateShareLinkMutation(kind, resourceId);
  const revokeMutation = useRevokeShareLinkMutation(kind, resourceId);

  function handleCreate() {
    createMutation.mutate(toExpiryDays(expiry), {
      onSuccess: async (link) => {
        const copied = await copyToClipboard(link.url);
        toast.success(copied ? tr.shares.createSuccess : tr.shares.createSuccessNoCopy);
      },
      onError: (error) =>
        toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError),
    });
  }

  async function handleCopy(link: ShareLink) {
    const copied = await copyToClipboard(link.url);
    if (copied) toast.success(tr.shares.copied);
    else toast.error(tr.common.copyFailed);
  }

  function handleRevoke() {
    if (!revokeTarget) return;
    revokeMutation.mutate(revokeTarget.id, {
      onSuccess: () => {
        toast.success(tr.shares.revokeSuccess);
        setRevokeTarget(null);
      },
      onError: (error) =>
        toast.error(error instanceof ApiError ? error.message : tr.common.unexpectedError),
    });
  }

  const links = linksQuery.data ?? [];

  return (
    <>
      <Modal
        title={tr.shares.modalTitle}
        subtitle={tr.shares.modalSubtitle}
        onClose={onClose}
        width="lg"
      >
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3 rounded-xl border border-app-border p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <Select
                  label={tr.shares.expiryLabel}
                  value={expiry}
                  onChange={(event) => setExpiry(event.target.value as ExpiryValue)}
                  options={EXPIRY_VALUES.map((value) => ({
                    value,
                    label: tr.shares.expiryOptions[value],
                  }))}
                />
              </div>
              <Button type="button" onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? tr.shares.creating : tr.shares.createButton}
              </Button>
            </div>
            <p className="text-xs text-app-muted">{tr.shares.snapshotNote}</p>
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-app-text">{tr.shares.existingTitle}</h3>
            {linksQuery.isPending && <p className="text-sm text-app-muted">{tr.common.loading}</p>}
            {linksQuery.isError && (
              <p className="text-sm text-app-danger">{tr.common.unexpectedError}</p>
            )}
            {linksQuery.isSuccess && links.length === 0 && (
              <p className="text-sm text-app-muted">{tr.shares.empty}</p>
            )}
            {links.map((link) => (
              <ShareLinkRow
                key={link.id}
                link={link}
                onCopy={() => void handleCopy(link)}
                onRevoke={() => setRevokeTarget(link)}
              />
            ))}
          </div>
        </div>
      </Modal>
      {revokeTarget && (
        <ConfirmModal
          title={tr.shares.revokeConfirmTitle}
          message={tr.shares.revokeConfirmMessage}
          confirmLabel={tr.shares.revokeButton}
          variant="danger"
          isPending={revokeMutation.isPending}
          onConfirm={handleRevoke}
          onCancel={() => setRevokeTarget(null)}
        />
      )}
    </>
  );
}

function ShareLinkRow({
  link,
  onCopy,
  onRevoke,
}: {
  link: ShareLink;
  onCopy: () => void;
  onRevoke: () => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-app-border p-3 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {statusBadge(link)}
          <span className="truncate text-xs text-app-muted" title={link.url}>
            {link.url}
          </span>
        </div>
        <p className="mt-1 text-xs text-app-muted">
          {tr.shares.createdBy(
            link.createdByName,
            dateTimeFormatter.format(new Date(link.createdAt)),
          )}
          {' · '}
          {link.expiresAt
            ? tr.shares.expiresAt(dateTimeFormatter.format(new Date(link.expiresAt)))
            : tr.shares.noExpiry}
          {' · '}
          {tr.shares.viewCount(link.viewCount)}
        </p>
      </div>
      {link.isActive && (
        <div className="flex shrink-0 items-center gap-2">
          <CircleIconButton
            icon={Copy}
            tooltip={tr.shares.copyButton}
            iconSize={16}
            onClick={onCopy}
          />
          <CircleIconButton
            icon={ExternalLink}
            tooltip={tr.shares.openButton}
            iconSize={16}
            onClick={() => window.open(link.url, '_blank', 'noopener,noreferrer')}
          />
          <CircleIconButton
            icon={Link2Off}
            variant="danger"
            tooltip={tr.shares.revokeButton}
            iconSize={16}
            onClick={onRevoke}
          />
        </div>
      )}
    </div>
  );
}
