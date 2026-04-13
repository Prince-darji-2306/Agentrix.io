"use client";

import React, { useState, useCallback } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
}

/**
 * Reusable copy button component
 * Replaces 3 inline copy implementations
 */
export default function CopyButton({ text, label = 'Copy', className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className={cn(
        'flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors',
        className
      )}
    >
      {copied ? (
        <>
          <Check className="w-3 h-3 text-chart-2" />
          <span className="text-chart-2">Copied</span>
        </>
      ) : (
        <>
          <Copy className="w-3 h-3" />
          <span>{label}</span>
        </>
      )}
    </button>
  );
}
