import type { NoteColor } from '../../lib/api';

export const NOTE_COLORS: readonly NoteColor[] = ['YELLOW', 'BLUE', 'RED', 'GREEN', 'PURPLE'];

/** Not kartinin soluk post-it rengi - swatchClassName renk secici dairesi, cardClassName
 * kartin kendi arka plani/kenarligi icin (bkz. note-card.tsx / note-form-modal.tsx). */
export const NOTE_COLOR_STYLES: Record<
  NoteColor,
  { swatchClassName: string; cardClassName: string }
> = {
  YELLOW: { swatchClassName: 'bg-yellow-200', cardClassName: 'bg-yellow-50 border-yellow-200' },
  BLUE: { swatchClassName: 'bg-blue-200', cardClassName: 'bg-blue-50 border-blue-200' },
  RED: { swatchClassName: 'bg-red-200', cardClassName: 'bg-red-50 border-red-200' },
  GREEN: { swatchClassName: 'bg-green-200', cardClassName: 'bg-green-50 border-green-200' },
  PURPLE: { swatchClassName: 'bg-purple-200', cardClassName: 'bg-purple-50 border-purple-200' },
};
