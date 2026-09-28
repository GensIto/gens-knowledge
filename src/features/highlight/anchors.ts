import type { HighlightSelector } from '@shared/contracts';

export function locate(
  text: string,
  selector: HighlightSelector,
): { start: number; end: number } | null {
  const { position, quote } = selector;
  if (text.slice(position.start, position.end) === quote.exact) return position;
  const candidates: { start: number; end: number; score: number }[] = [];
  for (
    let start = text.indexOf(quote.exact);
    start !== -1;
    start = text.indexOf(quote.exact, start + 1)
  ) {
    const end = start + quote.exact.length;
    const score =
      Number(
        Boolean(quote.prefix) &&
          text.slice(Math.max(0, start - quote.prefix.length), start) === quote.prefix,
      ) +
      Number(Boolean(quote.suffix) && text.slice(end, end + quote.suffix.length) === quote.suffix);
    candidates.push({ start, end, score });
  }
  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];
  // Don't silently attach an ambiguous annotation to the wrong occurrence.
  return best && (candidates.length === 1 || best.score > candidates[1].score)
    ? { start: best.start, end: best.end }
    : null;
}

export function selectionAnchor(
  root: HTMLElement,
  selection: Selection | null,
): HighlightSelector | null {
  if (!selection || selection.isCollapsed || !selection.rangeCount) return null;
  const range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return null;
  const before = range.cloneRange();
  before.selectNodeContents(root);
  before.setEnd(range.startContainer, range.startOffset);
  const start = before.toString().length;
  const exact = range.toString();
  const end = start + exact.length;
  if (!exact.trim() || exact.length > 10000) return null;
  const text = root.textContent ?? '';
  return {
    position: { start, end },
    quote: {
      exact,
      prefix: text.slice(Math.max(0, start - 32), start),
      suffix: text.slice(end, end + 32),
    },
  };
}

export function textRange(
  root: HTMLElement,
  position: { start: number; end: number },
): Range | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let offset = 0;
  let node = walker.nextNode();
  const range = document.createRange();
  let started = false;
  while (node) {
    const length = node.textContent?.length ?? 0;
    if (!started && position.start < offset + length) {
      range.setStart(node, position.start - offset);
      started = true;
    }
    if (started && position.end <= offset + length) {
      range.setEnd(node, position.end - offset);
      return range;
    }
    offset += length;
    node = walker.nextNode();
  }
  return null;
}
