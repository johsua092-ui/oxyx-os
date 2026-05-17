"use client";

// ─────────────────────────────────────────────────────────────
// Oxyx OS / Modules / Oxyx AI / Response Renderer
// Renders AI responses with clean markdown-like formatting.
// ─────────────────────────────────────────────────────────────

import React from 'react';

interface ResponseRendererProps {
  content: string;
}

export const ResponseRenderer: React.FC<ResponseRendererProps> = ({ content }) => {
  // Parse markdown-like content into styled elements
  const lines = content.split('\n');

  return (
    <div className="space-y-2 text-[13px] leading-relaxed">
      {lines.map((line, i) => {
        const trimmed = line.trim();

        // Headers
        if (trimmed.startsWith('### ')) {
          return (
            <h4 key={i} className="text-[12px] font-semibold tracking-[0.15em] uppercase text-white/60 mt-4 mb-1">
              {trimmed.slice(4)}
            </h4>
          );
        }
        if (trimmed.startsWith('## ')) {
          return (
            <h3 key={i} className="text-[14px] font-semibold text-white/80 mt-4 mb-1 border-b border-white/5 pb-1">
              {trimmed.slice(3)}
            </h3>
          );
        }
        if (trimmed.startsWith('# ')) {
          return (
            <h2 key={i} className="text-[15px] font-bold text-white/90 mt-4 mb-2">
              {trimmed.slice(2)}
            </h2>
          );
        }

        // Bullet points
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={i} className="flex gap-2 pl-2">
              <span className="text-white/20 mt-0.5 select-none">&#8226;</span>
              <span className="text-white/70 flex-1">{renderInlineCode(trimmed.slice(2))}</span>
            </div>
          );
        }

        // Numbered lists
        const numMatch = trimmed.match(/^(\d+)\.\s(.*)$/);
        if (numMatch) {
          return (
            <div key={i} className="flex gap-2 pl-2">
              <span className="text-white/25 text-[11px] font-mono mt-0.5 w-4 text-right select-none">{numMatch[1]}.</span>
              <span className="text-white/70 flex-1">{renderInlineCode(numMatch[2])}</span>
            </div>
          );
        }

        // Code blocks (simple single-line)
        if (trimmed.startsWith('```')) {
          return null; // Skip code fence markers
        }

        // Severity badges
        if (trimmed.includes('Critical') || trimmed.includes('CRITICAL')) {
          return <p key={i} className="text-red-400/90">{renderInlineCode(trimmed)}</p>;
        }
        if (trimmed.includes('High') || trimmed.includes('HIGH')) {
          return <p key={i} className="text-orange-400/80">{renderInlineCode(trimmed)}</p>;
        }

        // Empty lines
        if (!trimmed) {
          return <div key={i} className="h-2" />;
        }

        // Default paragraph
        return (
          <p key={i} className="text-white/65">{renderInlineCode(trimmed)}</p>
        );
      })}
    </div>
  );
};

// Render inline `code` segments
function renderInlineCode(text: string): React.ReactNode {
  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="px-1.5 py-0.5 bg-white/5 border border-white/8 rounded text-[11px] font-mono text-white/80">
          {part.slice(1, -1)}
        </code>
      );
    }

    // Bold
    const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
    return boldParts.map((bp, j) => {
      if (bp.startsWith('**') && bp.endsWith('**')) {
        return <strong key={`${i}-${j}`} className="text-white/85 font-medium">{bp.slice(2, -2)}</strong>;
      }
      return <span key={`${i}-${j}`}>{bp}</span>;
    });
  });
}
