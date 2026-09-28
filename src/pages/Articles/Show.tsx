import { Head, router, useForm } from '@inertiajs/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Label, Popover, TextArea, TextField } from 'react-aria-components';
import type { HighlightSelector } from '@shared/contracts';
import { ArticleReader, anchorRect } from '@/features/article/ArticleReader';
import type { TextAnchor } from '@/features/article/ArticleReader';
import { Layout } from '@/components/Layout';
import type { PageProps } from '@/pages.gen';

type OpenNote = { highlightId: string | null; anchor: TextAnchor; pinned: boolean };
export default function Show({
  article,
  content,
  highlights,
  memos,
  errors,
}: PageProps<'Articles/Show'>) {
  const [selection, setSelection] = useState<{
    selector: HighlightSelector;
    anchor: TextAnchor;
  } | null>(null);
  const [note, setNote] = useState<OpenNote | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const trigger = useRef<HTMLSpanElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const memo = useForm<{ highlightId: string | null; content: string }>({
    highlightId: null,
    content: '',
  });

  const keepOpen = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  }, []);
  const leave = useCallback(() => {
    if (closeTimer.current) return;
    closeTimer.current = setTimeout(() => {
      setNote((current) => (current?.pinned ? current : null));
      closeTimer.current = null;
    }, 300);
  }, []);
  const openHighlight = useCallback(
    (highlightId: string, anchor: TextAnchor, pinned: boolean) => {
      keepOpen();
      setNote((current) => {
        if (current?.pinned && !pinned) return current;
        if (current?.highlightId === highlightId && !pinned) return current;
        return { highlightId, anchor, pinned };
      });
    },
    [keepOpen],
  );
  const select = useCallback((selector: HighlightSelector | null, anchor?: TextAnchor) => {
    setSelection(selector && anchor ? { selector, anchor } : null);
    if (selector) setNote((current) => (current?.pinned ? current : null));
  }, []);
  useEffect(() => () => keepOpen(), [keepOpen]);
  // A hover card should not remain at stale screen coordinates while reading.
  useEffect(() => {
    const dismissHover = () => setNote((current) => (current?.pinned ? current : null));
    window.addEventListener('scroll', dismissHover, { passive: true });
    return () => window.removeEventListener('scroll', dismissHover);
  }, []);

  useEffect(() => {
    function dismiss(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      keepOpen();
      setNote(null);
      setEditing(false);
      setSelection(null);
      memo.reset();
    }
    document.addEventListener('keydown', dismiss);
    return () => document.removeEventListener('keydown', dismiss);
  }, [keepOpen, memo]);

  function closeNote() {
    keepOpen();
    setNote(null);
    setEditing(false);
    memo.reset();
  }
  function editNote() {
    if (!note) return;
    setNote({ ...note, pinned: true });
    memo.setData('highlightId', note.highlightId);
    setEditing(true);
  }
  function saveHighlight(withMemo: boolean) {
    if (!selection) return;
    const selected = selection;
    const existing = highlights.find(
      (highlight) =>
        highlight.position.start === selected.selector.position.start &&
        highlight.position.end === selected.selector.position.end &&
        highlight.quote.exact === selected.selector.quote.exact,
    );
    if (existing) {
      setSelection(null);
      window.getSelection()?.removeAllRanges();
      if (withMemo) {
        memo.setData('highlightId', existing.id);
        setNote({ highlightId: existing.id, anchor: selected.anchor, pinned: true });
        setEditing(true);
      }
      return;
    }
    const previousIds = new Set(highlights.map((highlight) => highlight.id));
    router.post(`/articles/${article.id}/highlights`, selected.selector, {
      preserveScroll: true,
      onStart: () => setSaving(true),
      onFinish: () => setSaving(false),
      onSuccess: (page) => {
        setSelection(null);
        window.getSelection()?.removeAllRanges();
        if (withMemo) {
          const created = (page.props.highlights as typeof highlights).find(
            (highlight) => !previousIds.has(highlight.id),
          );
          if (!created) return;
          memo.setData('highlightId', created.id);
          setNote({ highlightId: created.id, anchor: selected.anchor, pinned: true });
          setEditing(true);
        }
      },
    });
  }
  const visibleMemos = note ? memos.filter((item) => item.highlightId === note.highlightId) : [];
  return (
    <Layout>
      <Head title={`${article.title || '無題'} — gens`} />
      {article.status === 'ready' && (
        <div className="reading-tools">
          <button
            className="quiet-button"
            onClick={(event) => {
              memo.reset();
              setEditing(false);
              setSelection(null);
              setNote({
                highlightId: null,
                anchor: anchorRect(event.currentTarget.getBoundingClientRect()),
                pinned: true,
              });
            }}
          >
            読みながら
          </button>
        </div>
      )}
      <article className="reading-piece">
          <header className="article-heading">
            <h1>{article.title || '無題'}</h1>
            <a href={article.url} target="_blank" rel="noopener noreferrer">
              {article.siteName || new URL(article.url).hostname} ↗
            </a>
          </header>
          {article.status === 'ready' ? (
            <ArticleReader
              content={content}
              highlights={highlights}
              onSelect={select}
              onHighlight={openHighlight}
              onLeave={leave}
            />
          ) : (
            <div className="empty">
              <p>{article.error || 'まだ開けていない。少し待ってから、もう一度。'}</p>
              <Button
                className="primary"
                onPress={() =>
                  article.status === 'failed'
                    ? router.post('/articles', { url: article.url })
                    : router.reload()
                }
              >
                {article.status === 'failed' ? '再試行' : '更新'}
              </Button>
            </div>
          )}
          {errors.highlight && (
            <p role="alert" className="error">
              {errors.highlight}
            </p>
          )}
        </article>
      {selection && (
        <div
          className="selection-toolbar"
          role="toolbar"
          aria-label="選択した文章への操作"
          onPointerDown={(event) => event.preventDefault()}
        >
          <Button isDisabled={saving} onPress={() => saveHighlight(false)}>
            ハイライト
          </Button>
          <Button isDisabled={saving} onPress={() => saveHighlight(true)}>
            メモを追加
          </Button>
          <Button aria-label="選択を閉じる" onPress={() => setSelection(null)}>
            ×
          </Button>
        </div>
      )}
      <span
        ref={trigger}
        className="note-anchor"
        style={
          note
            ? {
                left: note.anchor.left,
                top: note.anchor.top,
                width: note.anchor.width,
                height: note.anchor.height,
              }
            : undefined
        }
      />
      <Popover
        triggerRef={trigger}
        isOpen={Boolean(note)}
        onOpenChange={(open) => {
          if (!open) closeNote();
        }}
        isNonModal
        placement="bottom"
        offset={8}
        className="note-popover"
        onMouseEnter={keepOpen}
        onMouseLeave={leave}
      >
        <section
          role="dialog"
          aria-label={note?.highlightId ? 'この文へのメモ' : '読みながらのメモ'}
          onFocusCapture={() =>
            setNote((current) => (current ? { ...current, pinned: true } : null))
          }
        >
          <div className="note-heading">
            <span>{note?.highlightId ? 'メモ' : '読みながら'}</span>
            <Button aria-label="メモを閉じる" onPress={closeNote}>
              ×
            </Button>
          </div>
          {visibleMemos.map((item) => (
            <p key={item.id} className="memo">
              {item.content}
            </p>
          ))}
          {!editing && (
            <Button className="text-button" onPress={editNote}>
              ＋ メモを追加
            </Button>
          )}
          {editing && (
            <form
              className="memo-form"
              onSubmit={(event) => {
                event.preventDefault();
                memo.post(`/articles/${article.id}/memos`, {
                  preserveScroll: true,
                  onSuccess: () => {
                    memo.reset('content');
                    setEditing(false);
                  },
                });
              }}
            >
              <TextField
                isRequired
                value={memo.data.content}
                onChange={(value) => memo.setData('content', value)}
                isDisabled={memo.processing}
              >
                <Label className="sr-only">メモ</Label>
                <TextArea autoFocus placeholder="メモを書く…" maxLength={10000} />
              </TextField>
              {errors.content && (
                <p role="alert" className="error">
                  {errors.content}
                </p>
              )}
              <div className="memo-actions">
                <Button
                  onPress={() => {
                    setEditing(false);
                    memo.reset('content');
                  }}
                >
                  キャンセル
                </Button>
                <Button
                  type="submit"
                  className="primary"
                  isDisabled={memo.processing || !memo.data.content.trim()}
                >
                  {memo.processing ? '残している…' : '残す'}
                </Button>
              </div>
            </form>
          )}
        </section>
      </Popover>
    </Layout>
  );
}
