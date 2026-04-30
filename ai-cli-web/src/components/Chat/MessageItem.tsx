import { motion } from "framer-motion";
import { User, Bot, Copy, Check } from "lucide-react";
import { useState } from "react";
import type { Message } from "@/types";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { cn, formatTime } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

interface MessageItemProps {
  message: Message;
  isStreaming?: boolean;
}

export function MessageItem({ message, isStreaming }: MessageItemProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "flex gap-4 py-6",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          isUser ? "bg-claude-accent text-white" : "bg-claude-sidebar text-claude-text"
        )}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      <div
        className={cn(
          "flex-1 max-w-[85%]",
          isUser ? "flex flex-col items-end" : ""
        )}
      >
        {!isUser && message.model && (
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium text-claude-textSecondary bg-claude-sidebar px-2 py-0.5 rounded-full">
              {message.model}
            </span>
          </div>
        )}

        <div
          className={cn(
            "rounded-2xl px-4 py-3",
            isUser
              ? "bg-claude-accent text-white"
              : "bg-claude-sidebar text-claude-text"
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-sm max-w-none">
              <MarkdownRenderer content={message.content} />
              {isStreaming && <span className="typing-cursor" />}
            </div>
          )}
        </div>

        <div
          className={cn(
            "flex items-center gap-2 mt-2",
            isUser ? "flex-row-reverse" : "flex-row"
          )}
        >
          <span className="text-xs text-claude-textSecondary">
            {formatTime(new Date(message.timestamp))}
          </span>

          {!isUser && !isStreaming && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-6 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
            >
              {copied ? (
                <Check className="w-3 h-3" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
