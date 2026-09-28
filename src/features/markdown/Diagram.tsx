import { useEffect, useRef, useState } from 'react';

let mermaidReady = false;
const renderedDiagrams = new Map<string, string>();

export function Diagram({ source }: { source: string }) {
  const host = useRef<HTMLDivElement>(null);
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const error = failedSource === source;

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const cached = renderedDiagrams.get(source);
    if (cached) {
      element.replaceChildren();
      element.insertAdjacentHTML('beforeend', cached);
      return;
    }
    let current = true;
    const id = `diagram-${crypto.randomUUID().replaceAll('-', '')}`;

    void import('mermaid')
      .then(async ({ default: mermaid }) => {
        if (!mermaidReady) {
          mermaid.initialize({
            startOnLoad: false,
            securityLevel: 'strict',
            htmlLabels: false,
            fontFamily: 'inherit',
            theme: 'base',
            themeVariables: {
              darkMode: true,
              background: '#262320',
              primaryColor: '#3a3530',
              primaryTextColor: '#ebe6dc',
              primaryBorderColor: '#6d655c',
              lineColor: '#b7aea2',
              secondaryColor: '#322e2a',
              tertiaryColor: '#262320',
              textColor: '#ebe6dc',
            },
          });
          mermaidReady = true;
        }
        const rendered = await mermaid.render(id, source);
        renderedDiagrams.set(source, rendered.svg);
        if (!current) return;
        element.replaceChildren();
        element.insertAdjacentHTML('beforeend', rendered.svg);
      })
      .catch(() => {
        document.getElementById(id)?.remove();
        if (current) setFailedSource(source);
      });

    return () => {
      current = false;
    };
  }, [source]);

  return (
    <div>
      {error && <p className="error">図の構文を確認してください</p>}
      <div ref={host} className="diagram" hidden={error} />
      {error && (
        <pre>
          <code>{source}</code>
        </pre>
      )}
    </div>
  );
}
