import { z } from 'zod';
import { tr } from '../../i18n/tr';

const t = tr.kanban;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const kanbanBoardFormSchema = z
  .object({
    name: z.string().trim().min(1, t.createModal.nameRequired).max(120),
    isShared: z.boolean(),
    /** Pasifken (ortak proje isaretli degil) react-hook-form undefined gonderir. */
    partnerTenantId: z.string().trim().optional(),
  })
  .superRefine((values, ctx) => {
    if (!values.isShared) return;
    if (!values.partnerTenantId) {
      ctx.addIssue({
        code: 'custom',
        path: ['partnerTenantId'],
        message: t.createModal.partnerRequired,
      });
    } else if (!UUID_PATTERN.test(values.partnerTenantId)) {
      ctx.addIssue({
        code: 'custom',
        path: ['partnerTenantId'],
        message: t.createModal.partnerInvalid,
      });
    }
  });
export type KanbanBoardFormValues = z.infer<typeof kanbanBoardFormSchema>;

export const kanbanBoardRenameSchema = z.object({
  name: z.string().trim().min(1, t.createModal.nameRequired).max(120),
});
export type KanbanBoardRenameValues = z.infer<typeof kanbanBoardRenameSchema>;

/** Revize notu zorunlu, ilerleme notu opsiyonel - ayni modal, iki sema. */
export const kanbanRequiredNoteSchema = z.object({
  note: z.string().trim().min(1, t.revision.noteRequired).max(2000),
});
export const kanbanOptionalNoteSchema = z.object({
  note: z.string().trim().max(2000),
});
export type KanbanMoveNoteValues = z.infer<typeof kanbanOptionalNoteSchema>;

export const kanbanCardFormSchema = z.object({
  title: z.string().trim().min(1, t.card.titleRequired).max(200),
  description: z.string().max(5000),
  /** '' = atanmamis (opsiyonel). */
  assigneeUserId: z.string(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  dueDate: z.string(),
});
export type KanbanCardFormValues = z.infer<typeof kanbanCardFormSchema>;
