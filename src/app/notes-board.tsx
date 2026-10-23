import { Plus } from 'lucide-react';
import { useState } from 'react';
import { NoteCard } from './note-card';
import { NoteFormModal } from './note-form-modal';
import { Button } from '../components/ui/button';
import { ConfirmModal } from '../components/ui/confirm-modal';
import { PageHelp } from '../components/ui/page-help';
import { useToast } from '../components/ui/toast-context';
import { useDeleteNoteMutation, useNotesQuery } from '../features/home/use-notes';
import { ApiError, type Note } from '../lib/api';
import { tr } from '../i18n/tr';

/** /anasayfa'ya gomulu, tam genislikte paylasimli not panosu - post-it tarzi kartlar,
 * her biri opsiyonel olarak bir Ajanda hatirlatmasina baglanabilir (bkz. note-card.tsx). */
export function NotesBoard() {
  const notesQuery = useNotesQuery();
  const deleteMutation = useDeleteNoteMutation();
  const toast = useToast();
  const t = tr.home.notes;

  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deletingNote, setDeletingNote] = useState<Note | null>(null);

  const notes = notesQuery.data ?? [];

  function openCreateModal() {
    setEditingNote(null);
    setShowForm(true);
  }

  function openEditModal(note: Note) {
    setEditingNote(note);
    setShowForm(true);
  }

  function handleConfirmDelete() {
    if (!deletingNote) return;
    deleteMutation.mutate(deletingNote.id, {
      onSuccess: () => setDeletingNote(null),
      onError: (error) => {
        toast.error(error instanceof ApiError ? error.message : t.deleteError);
        setDeletingNote(null);
      },
    });
  }

  return (
    <div className="mt-6 border border-app-border bg-app-surface p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-[11px] font-bold tracking-wide text-app-muted uppercase">
            {t.title}
          </h2>
          <PageHelp text={tr.help.homeNotes} />
        </div>
        <Button type="button" onClick={openCreateModal} className="flex items-center gap-1.5">
          <Plus size={16} />
          {t.newButton}
        </Button>
      </div>

      {notes.length === 0 ? (
        <p className="mt-6 text-sm text-app-muted">{t.empty}</p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onEdit={() => openEditModal(note)}
              onDelete={() => setDeletingNote(note)}
            />
          ))}
        </div>
      )}

      {showForm && (
        <NoteFormModal note={editingNote ?? undefined} onClose={() => setShowForm(false)} />
      )}

      {deletingNote && (
        <ConfirmModal
          title={t.deleteConfirmTitle}
          message={t.deleteConfirmMessage}
          confirmLabel={t.deleteConfirmButton}
          isPending={deleteMutation.isPending}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeletingNote(null)}
        />
      )}
    </div>
  );
}
