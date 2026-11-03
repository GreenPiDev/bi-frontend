import { MessageSquareText, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { SectionCard } from './post-sale-case-detail-sections';
import { ActionsMenu } from '../components/ui/actions-menu';
import { Button } from '../components/ui/button';
import { ConfirmModal } from '../components/ui/confirm-modal';
import { TextareaField } from '../components/ui/textarea-field';
import { useToast } from '../components/ui/toast-context';
import { formatPostSaleDate } from '../features/crm/format-post-sale-date';
import {
  useDeletePostSaleFeedbackNoteMutation,
  useMarkPostSaleFeedbackMutation,
  useUpdatePostSaleFeedbackNoteMutation,
} from '../features/crm/use-post-sale-cases';
import { ApiError, type PostSaleCase, type PostSaleFeedbackNote } from '../lib/api';
import { tr } from '../i18n/tr';

const t = tr.crm.postSaleCases.detail;

function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : tr.common.unexpectedError;
}

function FeedbackNoteCard({
  postSaleCaseId,
  note,
}: {
  postSaleCaseId: string;
  note: PostSaleFeedbackNote;
}) {
  const toast = useToast();
  const updateMutation = useUpdatePostSaleFeedbackNoteMutation(postSaleCaseId);
  const deleteMutation = useDeletePostSaleFeedbackNoteMutation(postSaleCaseId);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(note.text);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const wasEdited = note.updatedAt !== note.createdAt;

  function handleSave() {
    updateMutation.mutate(
      { noteId: note.id, text: draft.trim() },
      {
        onSuccess: () => {
          toast.success(t.feedbackNoteUpdateSuccess);
          setIsEditing(false);
        },
        onError: (error) => toast.error(errorMessage(error)),
      },
    );
  }

  function handleDelete() {
    deleteMutation.mutate(note.id, {
      onSuccess: () => toast.success(t.feedbackNoteDeleteSuccess),
      onError: (error) => toast.error(errorMessage(error)),
      onSettled: () => setIsDeleteOpen(false),
    });
  }

  return (
    <li className="rounded-lg border border-app-border bg-app-bg p-3">
      {isEditing ? (
        <div className="flex flex-col gap-3">
          <TextareaField
            label={t.feedbackNoteLabel}
            rows={3}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setDraft(note.text);
                setIsEditing(false);
              }}
            >
              {tr.common.cancel}
            </Button>
            <Button
              type="button"
              disabled={!draft.trim() || updateMutation.isPending}
              onClick={handleSave}
            >
              {tr.common.save}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between gap-2">
            <p className="min-w-0 flex-1 whitespace-pre-wrap break-words text-justify text-sm text-app-text">
              {note.text}
            </p>
            <ActionsMenu
              ariaLabel={t.feedbackNoteMenuLabel}
              items={[
                {
                  label: t.feedbackNoteEditAction,
                  icon: Pencil,
                  onSelect: () => {
                    setDraft(note.text);
                    setIsEditing(true);
                  },
                },
                {
                  label: t.feedbackNoteDeleteAction,
                  icon: Trash2,
                  variant: 'danger',
                  onSelect: () => setIsDeleteOpen(true),
                },
              ]}
            />
          </div>
          <p className="mt-2 text-xs text-app-muted">
            {formatPostSaleDate(note.createdAt)}
            {wasEdited && ` · ${t.feedbackNoteEdited}`}
          </p>
        </>
      )}
      {isDeleteOpen && (
        <ConfirmModal
          title={t.feedbackNoteDeleteConfirmTitle}
          message={t.feedbackNoteDeleteConfirm}
          confirmLabel={t.feedbackNoteDeleteConfirmLabel}
          isPending={deleteMutation.isPending}
          onConfirm={handleDelete}
          onCancel={() => setIsDeleteOpen(false)}
        />
      )}
    </li>
  );
}

export function PostSaleFeedbackCard({ postSaleCase }: { postSaleCase: PostSaleCase }) {
  const toast = useToast();
  const markFeedbackMutation = useMarkPostSaleFeedbackMutation(postSaleCase.id);
  const [responseNote, setResponseNote] = useState('');

  function handleSave() {
    markFeedbackMutation.mutate(
      { responseNote: responseNote.trim() || undefined },
      {
        onSuccess: () => {
          toast.success(t.markFeedbackSuccess);
          setResponseNote('');
        },
        onError: (error) => toast.error(errorMessage(error)),
      },
    );
  }

  return (
    <SectionCard
      icon={MessageSquareText}
      title={t.feedbackTitle}
      description={
        postSaleCase.feedbackReceivedAt
          ? `${t.alreadyReceivedLabel} (${formatPostSaleDate(postSaleCase.feedbackReceivedAt)})`
          : undefined
      }
    >
      <TextareaField
        label={t.feedbackNoteLabel}
        rows={4}
        value={responseNote}
        onChange={(event) => setResponseNote(event.target.value)}
      />
      <div className="mt-4 flex justify-end">
        <Button type="button" disabled={markFeedbackMutation.isPending} onClick={handleSave}>
          {t.markFeedbackButton}
        </Button>
      </div>

      {postSaleCase.feedbackNotes.length > 0 && (
        <ul className="mt-5 flex flex-col gap-3">
          {postSaleCase.feedbackNotes.map((note) => (
            <FeedbackNoteCard key={note.id} postSaleCaseId={postSaleCase.id} note={note} />
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
