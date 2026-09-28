import { common, createLowlight } from 'lowlight';
import { createElement, isValidElement, type ReactNode } from 'react';

export const lowlight = createLowlight(common);
const aliases: Record<string, string> = { tsx: 'typescript', jsx: 'javascript' };

type Token = {
  type: string;
  tagName?: string;
  value?: string;
  properties?: { className?: string[] };
  children?: Token[];
};

export const codeLanguages = [
  ['', '自動'],
  ['typescript', 'TypeScript'],
  ['javascript', 'JavaScript'],
  ['python', 'Python'],
  ['go', 'Go'],
  ['rust', 'Rust'],
  ['sql', 'SQL'],
  ['bash', 'Bash'],
  ['json', 'JSON'],
  ['html', 'HTML'],
  ['css', 'CSS'],
  ['markdown', 'Markdown'],
] as const;

export function fenceSource(children: ReactNode) {
  if (!isValidElement<{ className?: string; children?: ReactNode }>(children)) return null;
  const match = /language-([\w-]+)/.exec(children.props.className ?? '');
  return {
    language: match?.[1] ?? '',
    source: String(children.props.children ?? '').replace(/\n$/, ''),
  };
}

export function highlighted(source: string, language: string): ReactNode {
  const name = aliases[language] ?? language;
  try {
    const tree = name ? lowlight.highlight(name, source) : lowlight.highlightAuto(source);
    return render(tree);
  } catch {
    return source;
  }
}

function render(node: Token, key = 0): ReactNode {
  if (node.type === 'text') return node.value ?? '';
  if (node.type === 'root') return node.children?.map((child, index) => render(child, index));
  if (node.type !== 'element' || node.tagName !== 'span') return null;
  return createElement(
    'span',
    { key, className: node.properties?.className?.join(' ') },
    node.children?.map((child, index) => render(child, index)),
  );
}
