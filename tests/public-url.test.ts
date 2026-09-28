import { describe, expect, it } from 'vitest';
import { publicUrl } from '../worker/src/infrastructure/public-url';
import { highlightInput, memoInput } from '../shared/contracts';

describe('public article URLs', () => {
  it.each([
    'http://localhost',
    'http://127.1',
    'http://2130706433',
    'http://0x7f000001',
    'http://0.0.0.0',
    'http://10.0.0.1',
    'http://172.16.4.1',
    'http://192.168.1.1',
    'http://169.254.169.254',
    'http://100.64.0.1',
    'http://[::1]',
    'http://[::ffff:127.0.0.1]',
    'http://metadata.google.internal',
    'http://service.local',
    'http://localhost.',
    'file:///etc/passwd',
    'ftp://example.com',
    'https://user:pass@example.com',
    'https://example.com:8080',
  ])('rejects %s', (url) => expect(() => publicUrl(url)).toThrow());
  it('normalizes hosts, default ports and fragments', () =>
    expect(publicUrl('HTTPS://EXAMPLE.COM:443/a#heading').href).toBe('https://example.com/a'));
  it('allows public IPv4', () => expect(publicUrl('https://1.1.1.1/').hostname).toBe('1.1.1.1'));
});
it('rejects inconsistent annotation offsets', () =>
  expect(
    highlightInput.safeParse({
      position: { start: 4, end: 6 },
      quote: { exact: 'wrong length', prefix: '', suffix: '' },
    }).success,
  ).toBe(false));
it('rejects whitespace-only memos', () =>
  expect(memoInput.safeParse({ content: '   ' }).success).toBe(false));
