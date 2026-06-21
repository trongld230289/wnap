import { useEffect, useRef } from 'react';
import { useGuideI18n } from './useGuideI18n';
import { buildMindmapSource, LEAF_TO_USECASE } from './mainFunctions';

let renderCounter = 0;

export function OverviewMindmap({ onSelectLeaf }: { onSelectLeaf: (id: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { lang } = useGuideI18n();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const mermaid = (await import('mermaid')).default;
      mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose' });
      const id = `wnap-mindmap-${++renderCounter}`;
      const { svg, bindFunctions } = await mermaid.render(id, buildMindmapSource(lang));
      if (cancelled || !containerRef.current) return;
      containerRef.current.innerHTML = svg;
      bindFunctions?.(containerRef.current);

      // Attach click handlers to leaf <text> elements
      containerRef.current.querySelectorAll('text').forEach((node) => {
        const label = node.textContent?.trim() ?? '';
        const useCaseId = LEAF_TO_USECASE[label];
        if (useCaseId) {
          node.style.cursor = 'pointer';
          node.style.textDecoration = 'underline';
          node.addEventListener('click', () => onSelectLeaf(useCaseId));
        }
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [lang, onSelectLeaf]);

  return <div ref={containerRef} className="flex justify-center w-full overflow-auto" />;
}
