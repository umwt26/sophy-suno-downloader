import React from "react";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

function renderInline(text: string): React.ReactNode[] {
  // Regex to match inline elements: bold, italic, inline code, links
  const regex = /(\*\*.*?\*\*|\*.*?\*|`.*?`|\[.*?\]\(.*?\))/g;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (!part) return null;

    // Bold: **text**
    if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
      return (
        <strong key={index} className="font-bold text-[var(--color-text-primary)]">
          {part.slice(2, -2)}
        </strong>
      );
    }

    // Inline code: `code`
    if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
      return (
        <code
          key={index}
          className="rounded-md border border-[var(--color-app-border)] bg-[var(--color-app-surface-2)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--color-accent)]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    // Italic: *text*
    if (part.startsWith("*") && part.endsWith("*") && part.length >= 2) {
      return (
        <em key={index} className="italic text-[var(--color-text-secondary)]">
          {part.slice(1, -1)}
        </em>
      );
    }

    // Links: [label](url)
    const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
    if (linkMatch) {
      return (
        <a
          key={index}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--color-accent)] underline underline-offset-2 hover:opacity-80 transition-opacity"
        >
          {linkMatch[1]}
        </a>
      );
    }

    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = "" }) => {
  if (!content || !content.trim()) {
    return null;
  }

  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];
  let codeBlockLang = "";

  lines.forEach((rawLine, idx) => {
    const trimmed = rawLine.trim();

    // Check code blocks
    if (trimmed.startsWith("```")) {
      if (inCodeBlock) {
        // Close code block
        elements.push(
          <div
            key={`code-${idx}`}
            className="my-2.5 overflow-x-auto rounded-xl border border-[var(--color-app-border)] bg-black/60 p-3 font-mono text-xs text-[var(--color-text-primary)]"
          >
            {codeBlockLang && (
              <div className="mb-1 text-[10px] font-mono text-[var(--color-text-tertiary)] uppercase">
                {codeBlockLang}
              </div>
            )}
            <pre className="m-0 leading-relaxed">{codeBlockContent.join("\n")}</pre>
          </div>
        );
        codeBlockContent = [];
        codeBlockLang = "";
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        codeBlockLang = trimmed.slice(3).trim();
      }
      return;
    }

    if (inCodeBlock) {
      codeBlockContent.push(rawLine);
      return;
    }

    // Horizontal Rule
    if (trimmed === "---" || trimmed === "***" || trimmed === "___") {
      elements.push(
        <hr
          key={`hr-${idx}`}
          className="my-3 border-t border-[var(--color-app-border)]/70"
        />
      );
      return;
    }

    // Headings
    if (trimmed.startsWith("# ")) {
      elements.push(
        <h1
          key={`h1-${idx}`}
          className="mt-4 mb-1.5 text-base sm:text-lg font-bold tracking-tight text-[var(--color-text-primary)] border-b border-[var(--color-app-border)]/50 pb-1.5 flex items-center gap-2"
        >
          <span className="h-2 w-2 rounded-full bg-[var(--color-accent)] inline-block shrink-0" />
          <span>{renderInline(trimmed.slice(2))}</span>
        </h1>
      );
      return;
    }

    if (trimmed.startsWith("## ")) {
      elements.push(
        <h2
          key={`h2-${idx}`}
          className="mt-3.5 mb-1.5 text-sm sm:text-base font-bold text-[var(--color-text-primary)] flex items-center gap-2"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)] inline-block shrink-0" />
          <span>{renderInline(trimmed.slice(3))}</span>
        </h2>
      );
      return;
    }

    if (trimmed.startsWith("### ")) {
      elements.push(
        <h3
          key={`h3-${idx}`}
          className="mt-3 mb-1 text-xs sm:text-sm font-semibold uppercase tracking-wider text-[var(--color-accent)]"
        >
          {renderInline(trimmed.slice(4))}
        </h3>
      );
      return;
    }

    // Unordered list items
    const isIndentedList = rawLine.startsWith("  * ") || rawLine.startsWith("    * ") || rawLine.startsWith("  - ") || rawLine.startsWith("    - ");
    const isTopList = trimmed.startsWith("* ") || trimmed.startsWith("- ");

    if (isTopList || isIndentedList) {
      const bulletText = trimmed.slice(2);
      elements.push(
        <div
          key={`li-${idx}`}
          className={`flex items-start gap-2.5 text-xs text-[var(--color-text-secondary)] leading-relaxed my-1 ${
            isIndentedList ? "ml-5 pl-2 border-l border-[var(--color-app-border)]/60 text-[11px]" : "ml-1"
          }`}
        >
          <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)]/80" />
          <div className="min-w-0 flex-1">{renderInline(bulletText)}</div>
        </div>
      );
      return;
    }

    // Empty lines
    if (!trimmed) {
      elements.push(<div key={`empty-${idx}`} className="h-1" />);
      return;
    }

    // Standard paragraph
    elements.push(
      <p
        key={`p-${idx}`}
        className="my-1.5 text-xs leading-relaxed text-[var(--color-text-secondary)]"
      >
        {renderInline(trimmed)}
      </p>
    );
  });

  return <div className={`space-y-0.5 ${className}`}>{elements}</div>;
};
