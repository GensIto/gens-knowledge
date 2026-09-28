import { describe, expect, it } from 'vitest';
import { locate } from '../src/features/highlight/anchors';
import type { HighlightSelector } from '../shared/contracts';
const selector: HighlightSelector = {
  position: { start: 3, end: 6 },
  quote: { exact: 'cat', prefix: 'a ', suffix: ' sleeps' },
};
describe('annotation restoration', () => {
  it('restores an unchanged position', () =>
    expect(locate('A: cat is here', selector)).toEqual({ start: 3, end: 6 }));
  it('finds a unique quote after content shifts', () =>
    expect(locate('The cat is here', selector)).toEqual({ start: 4, end: 7 }));
  it('disambiguates repeated quotes with context', () =>
    expect(locate('cat runs; a cat sleeps', selector)).toEqual({ start: 12, end: 15 }));
  it('does not choose an ambiguous quote', () =>
    expect(locate('cat runs cat runs', selector)).toBeNull());
  it('handles missing quotes', () => expect(locate('a dog sleeps', selector)).toBeNull());
  it('preserves UTF-16 offsets for Japanese and emoji', () =>
    expect(
      locate('前文。🌸桜が咲く', {
        position: { start: 0, end: 3 },
        quote: { exact: '🌸桜', prefix: '前文。', suffix: 'が咲く' },
      }),
    ).toEqual({ start: 3, end: 6 }));
});
