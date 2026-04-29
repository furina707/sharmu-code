import { useState, useRef, useEffect, type FormEvent, type KeyboardEvent } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export function ChatInput({ onSend, isLoading, disabled }: ChatInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading && !disabled) {
      onSend(input.trim());
      setInput("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="border-t border-claude-border bg-claude-bg p-4">
      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
        <div className="relative flex items-end bg-claude-bg border border-claude-border rounded-3xl shadow-claude-input focus-within:ring-2 focus-within:ring-claude-accent/30 focus-within:border-claude-accent transition-all">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息..."
            disabled={disabled || isLoading}
            rows={1}
            className="flex-1 px-4 py-3 bg-transparent resize-none focus:outline-none text-claude-text placeholder:text-claude-textSecondary min-h-[48px] max-h-[200px]"
          />
          <div className="flex items-center pr-2 pb-2">
            <Button
              type="submit"
              variant={input.trim() ? "primary" : "secondary"}
              size="sm"
              disabled={!input.trim() || isLoading || disabled}
              className="rounded-full w-9 h-9 p-0"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
        <p className="text-xs text-claude-textSecondary text-center mt-2">
          按 Enter 发送，Shift + Enter 换行
        </p>
      </form>
    </div>
  );
}
