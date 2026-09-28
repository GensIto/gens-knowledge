import type { Editor } from '@tiptap/core';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { FloatingMenuPlugin } from '@tiptap/extension-floating-menu';
import { Placeholder } from '@tiptap/extensions';
import { Markdown } from '@tiptap/markdown';
import { PluginKey } from '@tiptap/pm/state';
import {
  EditorContent,
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  useEditor,
  type ReactNodeViewProps,
} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Diagram } from '@/features/markdown/Diagram';
import { codeLanguages, lowlight } from '@/features/markdown/highlight';

const floatingMenuKey = new PluginKey('postFloatingMenu');
const diagramSource = 'flowchart LR\n  A --> B';

const Block = CodeBlockLowlight.extend({
  addNodeView() {
    return ReactNodeViewRenderer(BlockView);
  },
}).configure({ lowlight });

function BlockView({ node, editor, getPos, selectionInside }: ReactNodeViewProps) {
  const language = typeof node.attrs.language === 'string' ? node.attrs.language : '';
  const mermaid = language === 'mermaid';
  const [focused, setFocused] = useState(editor.isFocused);
  useEffect(() => {
    const update = () => setFocused(editor.isFocused);
    editor.on('focus', update);
    editor.on('blur', update);
    return () => {
      editor.off('focus', update);
      editor.off('blur', update);
    };
  }, [editor]);
  const showSource = !mermaid || (Boolean(selectionInside) && focused);

  function editDiagram() {
    const pos = getPos();
    if (typeof pos !== 'number') return;
    editor.chain().focus().setTextSelection(pos + 1).run();
  }

  return (
    <NodeViewWrapper>
      {mermaid && !showSource && (
        <button type="button" className="diagram-hit" contentEditable={false} onClick={editDiagram}>
          <Diagram source={node.textContent} />
        </button>
      )}
      <pre className="code-block" hidden={mermaid && !showSource}>
        {!mermaid && (
          <select
            className="code-lang"
            contentEditable={false}
            aria-label="コードの言語"
            value={codeLanguages.some(([id]) => id === language) ? language : ''}
            onMouseDown={(event) => event.stopPropagation()}
            onChange={(event) => {
              const pos = getPos();
              if (typeof pos !== 'number') return;
              editor
                .chain()
                .setNodeSelection(pos)
                .updateAttributes('codeBlock', { language: event.target.value || null })
                .run();
            }}
          >
            {codeLanguages.map(([id, label]) => (
              <option key={id || 'auto'} value={id}>
                {label}
              </option>
            ))}
          </select>
        )}
        <NodeViewContent />
      </pre>
    </NodeViewWrapper>
  );
}

function FloatingMenu({ editor, children }: { editor: Editor; children: ReactNode }) {
  const host = useMemo(() => {
    const element = document.createElement('div');
    element.className = 'floating-menu';
    element.setAttribute('role', 'toolbar');
    element.setAttribute('aria-label', '本文の書式');
    element.style.visibility = 'hidden';
    element.style.position = 'absolute';
    return element;
  }, []);

  useEffect(() => {
    let attached = false;
    const attach = () => {
      if (attached || editor.isDestroyed) return;
      try {
        if (!editor.view.dom) return;
      } catch {
        return;
      }
      editor.registerPlugin(
        FloatingMenuPlugin({
          pluginKey: floatingMenuKey,
          editor,
          element: host,
          appendTo: () => document.body,
          shouldShow: ({ editor: current, view, state }) => {
            const { $anchor, empty } = state.selection;
            const block = $anchor.parent;
            return (
              current.isEditable &&
              view.hasFocus() &&
              empty &&
              block.isTextblock &&
              !block.type.spec.code &&
              block.childCount === 0 &&
              block.textContent.length === 0
            );
          },
          options: { placement: 'bottom-start', offset: 6 },
        }),
      );
      attached = true;
    };
    attach();
    editor.on('mount', attach);
    return () => {
      editor.off('mount', attach);
      if (attached && !editor.isDestroyed) editor.unregisterPlugin(floatingMenuKey);
    };
  }, [editor, host]);

  return createPortal(children, host);
}

export function PostEditor({
  content,
  onChange,
}: {
  content: string;
  onChange: (markdown: string) => void;
}) {
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      Block,
      Markdown,
      Placeholder.configure({ placeholder: '本文を書く…' }),
    ],
    content,
    contentType: 'markdown',
    editorProps: {
      attributes: {
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-labelledby': 'post-body-label',
      },
    },
    onUpdate: ({ editor: current }) => onChangeRef.current(current.getMarkdown()),
  });

  return (
    <div className="writing-surface reader-prose">
      <EditorContent editor={editor} />
      {editor && (
        <FloatingMenu editor={editor}>
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          >
            見出し
          </button>
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            太字
          </button>
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            箇条書き
          </button>
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          >
            コード
          </button>
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() =>
              editor
                .chain()
                .focus()
                .toggleCodeBlock({ language: 'mermaid' })
                .insertContent(diagramSource)
                .run()
            }
          >
            図
          </button>
        </FloatingMenu>
      )}
    </div>
  );
}
