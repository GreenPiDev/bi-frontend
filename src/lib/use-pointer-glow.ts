import type { MouseEvent } from 'react';

/** Kartin uzerinde imlec konumunu --mx/--my CSS degiskenlerine yazar; `.landing-spot`
 * sinifi bu degiskenlerle imleci izleyen isik/kenarlik efekti cizer. */
export function handlePointerGlow(event: MouseEvent<HTMLElement>) {
  const element = event.currentTarget;
  const rect = element.getBoundingClientRect();
  element.style.setProperty('--mx', `${event.clientX - rect.left}px`);
  element.style.setProperty('--my', `${event.clientY - rect.top}px`);
}
