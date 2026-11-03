// Backend builds file-proxy URLs (avatars, logos, product images, attachments) from its
// static API_PUBLIC_URL env (e.g. http://localhost:3011/api/v1/files?key=...). When the SPA
// is opened from another host (a LAN IP like 192.168.x.x, or a phone on the same Wi-Fi),
// the auth cookie belongs to that host, so an <img> pointing at "localhost" is sent without
// the cookie and gets 401. We rebase such URLs onto the API base the SPA actually talks to,
// keeping the path suffix and query untouched. In prod both origins are identical, so this
// is a no-op there.
const FILE_PROXY_URL = /^https?:\/\/[^/?#]+(?:\/[^?#]*)?\/files\?key=/;

export function rebaseFileUrl(value: string, apiBaseUrl: string): string {
  const match = FILE_PROXY_URL.exec(value);
  if (!match) return value;
  const base = apiBaseUrl.replace(/\/+$/, '');
  return `${base}/files?key=${value.slice(match[0].length)}`;
}

/** Parses a JSON response body, rebasing every file-proxy URL string found anywhere in it. */
export function parseJsonWithRebasedFileUrls(text: string, apiBaseUrl: string): unknown {
  return JSON.parse(text, (_key, value: unknown) =>
    typeof value === 'string' ? rebaseFileUrl(value, apiBaseUrl) : value,
  );
}
