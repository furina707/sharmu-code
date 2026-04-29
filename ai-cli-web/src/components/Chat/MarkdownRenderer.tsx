import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || "");
          const language = match ? match[1] : "";
          const codeString = String(children).replace(/\n$/, "");
          const isInline = !match;

          if (isInline) {
            return (
              <code
                className="bg-claude-sidebar px-1.5 py-0.5 rounded text-sm font-mono text-claude-text"
                {...props}
              >
                {children}
              </code>
            );
          }

          return (
            <div className="relative group my-4">
              <div className="flex items-center justify-between bg-claude-sidebar rounded-t-xl px-4 py-2 border-b border-claude-border">
                <span className="text-xs text-claude-textSecondary font-mono">
                  {language || "code"}
                </span>
                <CopyButton code={codeString} />
              </div>
              <SyntaxHighlighter
                style={oneLight}
                language={language}
                PreTag="div"
                customStyle={{
                  margin: 0,
                  borderTopLeftRadius: 0,
                  borderTopRightRadius: 0,
                  borderBottomLeftRadius: "0.75rem",
                  borderBottomRightRadius: "0.75rem",
                  background: "#F4F4F4",
                  padding: "1rem",
                }}
              >
                {codeString}
              </SyntaxHighlighter>
            </div>
          );
        },
        p({ children }) {
          return <p className="mb-4 last:mb-0 leading-relaxed">{children}</p>;
        },
        ul({ children }) {
          return <ul className="list-disc list-inside mb-4 space-y-1">{children}</ul>;
        },
        ol({ children }) {
          return <ol className="list-decimal list-inside mb-4 space-y-1">{children}</ol>;
        },
        li({ children }) {
          return <li className="leading-relaxed">{children}</li>;
        },
        h1({ children }) {
          return <h1 className="text-2xl font-bold mb-4 mt-6 first:mt-0">{children}</h1>;
        },
        h2({ children }) {
          return <h2 className="text-xl font-bold mb-3 mt-5 first:mt-0">{children}</h2>;
        },
        h3({ children }) {
          return <h3 className="text-lg font-semibold mb-2 mt-4 first:mt-0">{children}</h3>;
        },
        blockquote({ children }) {
          return (
            <blockquote className="border-l-4 border-claude-border pl-4 my-4 text-claude-textSecondary italic">
              {children}
            </blockquote>
          );
        },
        a({ href, children }) {
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-claude-accent hover:underline"
            >
              {children}
            </a>
          );
        },
        table({ children }) {
          return (
            <div className="overflow-x-auto my-4">
              <table className="w-full border-collapse border border-claude-border rounded-xl">
                {children}
              </table>
            </div>
          );
        },
        th({ children }) {
          return (
            <th className="border border-claude-border px-3 py-2 bg-claude-sidebar font-semibold text-left">
              {children}
            </th>
          );
        },
        td({ children }) {
          return (
            <td className="border border-claude-border px-3 py-2">{children}</td>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      className="h-7 px-2 text-xs"
    >
      {copied ? (
        <>
          <Check className="w-3 h-3 mr-1" />
          已复制
        </>
      ) : (
        <>
          <Copy className="w-3 h-3 mr-1" />
          复制
        </>
      )}
    </Button>
  );
}
