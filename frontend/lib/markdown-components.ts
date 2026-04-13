import React, { useState, useCallback, useRef } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * CodeBlock component for markdown code rendering
 */
function CodeBlock({ children, className }: { children: React.ReactNode; className?: string }) {
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLDivElement>(null);

  const handleCopy = useCallback(() => {
    if (codeRef.current) {
      navigator.clipboard.writeText(codeRef.current.textContent || '').then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  }, []);

  return (
    <div className="relative group my-2 border border-border bg-secondary/30 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-secondary/80">
        <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Code</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-chart-2" />
              <span className="text-chart-2">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <div
        ref={codeRef}
        className={cn('p-3 text-[11px] font-mono text-foreground overflow-auto whitespace-pre-wrap bg-background/50', className)}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Shared markdown rendering components
 * Used by ChatMessage, AgentPanel, HistoryPanel
 */
export const MarkdownComponents: any = {
  h1: ({ node, ...props }: any) => (
    <h1 className="text-sm font-mono font-bold text-foreground uppercase tracking-widest mt-4 mb-2" {...props} />
  ),
  h2: ({ node, ...props }: any) => (
    <h2 className="text-xs font-mono font-bold text-foreground uppercase tracking-widest mt-4 mb-2 border-b border-border pb-1" {...props} />
  ),
  h3: ({ node, ...props }: any) => (
    <h3 className="text-[11px] font-mono font-semibold text-primary mt-3 mb-1" {...props} />
  ),
  p: ({ node, ...props }: any) => <p className="leading-relaxed my-1.5 text-muted-foreground" {...props} />,
  code: ({ node, inline, className, children, ...props }: any) => {
    if (inline)
      return (
        <code className="bg-secondary/50 border border-border/50 px-1.5 py-0.5 text-[11px] font-mono rounded" {...props}>
          {children}
        </code>
      );
    return <CodeBlock className={className}>{children}</CodeBlock>;
  },
  pre: ({ node, ...props }: any) => <pre className="m-0 p-0 bg-transparent" {...props} />,
};
