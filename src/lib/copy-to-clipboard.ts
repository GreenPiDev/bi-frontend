/**
 * Copies text to the clipboard. Falls back to a hidden textarea + execCommand when the async
 * Clipboard API is unavailable (non-secure context) or rejects (e.g. focus-trapped modals).
 * Returns true on success.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path
  }

  const previouslyFocused =
    document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.top = '0';
  textarea.style.left = '0';
  textarea.style.opacity = '0';
  // Append inside the focused element's container so modal focus traps do not steal focus.
  const host = previouslyFocused?.closest('[role="dialog"]') ?? document.body;
  host.appendChild(textarea);
  try {
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    host.removeChild(textarea);
    previouslyFocused?.focus();
  }
}
