import { describe, expect, it } from 'vitest';
import { parseJsonWithRebasedFileUrls, rebaseFileUrl } from './file-url';

const LAN_BASE = 'http://192.168.1.148:3011/api/v1';

describe('rebaseFileUrl', () => {
  it('rebases a localhost file-proxy URL onto the active API base', () => {
    expect(rebaseFileUrl('http://localhost:3011/api/v1/files?key=t%2Flogo.png&v=1', LAN_BASE)).toBe(
      'http://192.168.1.148:3011/api/v1/files?key=t%2Flogo.png&v=1',
    );
  });

  it('keeps extra query params such as name', () => {
    expect(
      rebaseFileUrl('http://localhost:3011/api/v1/files?key=a&v=2&name=x.pdf', `${LAN_BASE}/`),
    ).toBe('http://192.168.1.148:3011/api/v1/files?key=a&v=2&name=x.pdf');
  });

  it('leaves unrelated strings and data URLs untouched', () => {
    expect(rebaseFileUrl('https://example.com/a.png', LAN_BASE)).toBe('https://example.com/a.png');
    expect(rebaseFileUrl('data:image/png;base64,AAA', LAN_BASE)).toBe('data:image/png;base64,AAA');
    expect(rebaseFileUrl('Firma files?key=abc', LAN_BASE)).toBe('Firma files?key=abc');
  });
});

describe('parseJsonWithRebasedFileUrls', () => {
  it('rebases nested file URLs and keeps other values', () => {
    const body = JSON.stringify({
      name: 'Ali',
      avatarUrl: 'http://localhost:3011/api/v1/files?key=u.png&v=3',
      items: [{ logoUrl: 'http://localhost:3011/api/v1/files?key=l.png&v=4', count: 2 }],
      empty: null,
    });
    expect(parseJsonWithRebasedFileUrls(body, LAN_BASE)).toEqual({
      name: 'Ali',
      avatarUrl: `${LAN_BASE}/files?key=u.png&v=3`,
      items: [{ logoUrl: `${LAN_BASE}/files?key=l.png&v=4`, count: 2 }],
      empty: null,
    });
  });
});
