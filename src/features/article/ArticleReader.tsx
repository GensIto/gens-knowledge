import { memo, useEffect, useLayoutEffect, useRef } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Highlight, HighlightSelector } from '@shared/contracts';
import { locate, selectionAnchor, textRange } from '@/features/highlight/anchors';
import { fenceSource, highlighted } from '@/features/markdown/highlight';

const prose = {
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
  img: ({ src, alt }: { src?: string; alt?: string }) => (
    <img src={src} alt={alt || ''} loading="lazy" referrerPolicy="no-referrer" />
  ),
  pre: ({ children }: { children?: React.ReactNode }) => {
    const block = fenceSource(children);
    if (!block || block.language === 'mermaid') return <pre>{children}</pre>;
    return (
      <pre className="code-block">
        {block.language && <span className="code-lang">{block.language}</span>}
        <code>{highlighted(block.source, block.language)}</code>
      </pre>
    );
  },
};
const remark = [remarkGfm];
const ArticleProse = memo(function ArticleProse({ content }: { content: string }) {
  return (
    <Markdown remarkPlugins={remark} skipHtml components={prose}>
      {content}
    </Markdown>
  );
});

export type TextAnchor = { left: number; top: number; width: number; height: number };
export function anchorRect(rect: DOMRect): TextAnchor {
  return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
}

export function ArticleReader({
  content,
  highlights,
  onSelect,
  onHighlight,
  onLeave,
}: {
  content: string;
  highlights: Highlight[];
  onSelect: (selector: HighlightSelector | null, anchor?: TextAnchor) => void;
  onHighlight: (id: string, anchor: TextAnchor, pinned: boolean) => void;
  onLeave: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const ranges = useRef<{ id: string; range: Range }[]>([]);

  useLayoutEffect(() => {
    const element = root.current;
    if (!element) return;

    const text = element.textContent ?? '';
    ranges.current = highlights.flatMap((highlight) => {
      const position = locate(text, highlight);
      const range = position && textRange(element, position);
      return range ? [{ id: highlight.id, range }] : [];
    });

    if ('highlights' in CSS && 'Highlight' in window) {
      CSS.highlights.set(
        'saved',
        new window.Highlight(...ranges.current.map((item) => item.range)),
      );
    }

    return () => {
      ranges.current = [];
      if ('highlights' in CSS) CSS.highlights.delete('saved');
    };
  }, [content, highlights]);

  useEffect(() => {
    function capture() {
      if (!root.current) return;
      const selection = window.getSelection();
      const selector = selectionAnchor(root.current, selection);
      if (selector && selection) {
        onSelect(selector, anchorRect(selection.getRangeAt(0).getBoundingClientRect()));
      }
    }
    document.addEventListener('selectionchange', capture);

    return () => document.removeEventListener('selectionchange', capture);
  }, [onSelect]);

  function hit(x: number, y: number) {
    for (const item of ranges.current) {
      for (const rect of item.range.getClientRects()) {
        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom)
          return { id: item.id, anchor: anchorRect(rect) };
      }
    }
    return null;
  }

  return (
    <>
      <div
        ref={root}
        className="reader-prose"
        onPointerMove={(event) => {
          if (event.pointerType !== 'mouse' || event.buttons || !window.getSelection()?.isCollapsed)
            return;
          const target = hit(event.clientX, event.clientY);
          event.currentTarget.style.cursor = target ? 'pointer' : '';
          if (target) {
            onHighlight(target.id, target.anchor, false);
          } else {
            onLeave();
          }
        }}
        onPointerLeave={onLeave}
        onPointerUp={(event) => {
          const selected = selectionAnchor(event.currentTarget, window.getSelection());
          if (selected) {
            onSelect(
              selected,
              anchorRect(window.getSelection()!.getRangeAt(0).getBoundingClientRect()),
            );
            return;
          }
          const target = hit(event.clientX, event.clientY);
          if (target) {
            event.preventDefault();
            onHighlight(target.id, target.anchor, true);
          } else onSelect(null);
        }}
      >
        <ArticleProse content={content} />
      </div>
      {/* Keyboard access lives outside the text root so it cannot change offsets. */}
      <div className="highlight-shortcuts">
        {highlights.map((highlight) => (
          <button
            key={highlight.id}
            className="sr-only focus:not-sr-only"
            onClick={() => {
              const item = ranges.current.find((item) => item.id === highlight.id);
              if (!item) return;
              item.range.startContainer.parentElement?.scrollIntoView({ block: 'center' });
              onHighlight(highlight.id, anchorRect(item.range.getBoundingClientRect()), true);
            }}
          >
            ハイライトのメモ: {highlight.quote.exact.slice(0, 45)}
          </button>
        ))}
      </div>
    </>
  );
}
