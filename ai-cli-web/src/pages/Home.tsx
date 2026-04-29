import { useState, useCallback } from "react";
import { Menu } from "lucide-react";
import { Sidebar } from "@/components/Sidebar/Sidebar";
import { SettingsPanel } from "@/components/Settings/SettingsPanel";
import { MessageList } from "@/components/Chat/MessageList";
import { ChatInput } from "@/components/Chat/ChatInput";
import { useChatStore } from "@/stores/chatStore";
import { useConfigStore } from "@/stores/configStore";
import { aiService } from "@/services/api";
import { Button } from "@/components/ui/Button";
import type { Message } from "@/types";

export function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const {
    currentConversationId,
    createConversation,
    addMessage,
    setLoading,
    setStreamingContent,
    appendStreamingContent,
    clearStreamingContent,
    setError,
    isLoading,
    streamingContent,
    error,
    getCurrentMessages,
  } = useChatStore();

  const { config, switchModel, updateTokenUsage, isConfigured } = useConfigStore();

  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!isConfigured()) {
        setSettingsOpen(true);
        return;
      }

      let conversationId = currentConversationId;

      if (!conversationId) {
        conversationId = createConversation();
      }

      const userMessage: Message = {
        id: `${Date.now()}-user`,
        role: "user",
        content,
        timestamp: new Date(),
      };

      addMessage(conversationId, userMessage);
      setLoading(true);
      clearStreamingContent();
      setError(null);

      try {
        const messages = getCurrentMessages();
        const response = await aiService.chatCompletion(
          [...messages, userMessage],
          config.currentModel,
          (chunk) => {
            appendStreamingContent(chunk);
          }
        );

        const assistantMessage: Message = {
          id: `${Date.now()}-assistant`,
          role: "assistant",
          content: response,
          timestamp: new Date(),
          model: config.currentModel,
        };

        addMessage(conversationId, assistantMessage);
        updateTokenUsage(config.currentModel, response.length);
      } catch (err) {
        console.error("Chat error:", err);

        const nextModel = switchModel();
        if (nextModel) {
          setError(`模型 ${config.currentModel} 请求失败，已切换到 ${nextModel}`);
        } else {
          setError(err instanceof Error ? err.message : "请求失败，请重试");
        }
      } finally {
        setLoading(false);
        clearStreamingContent();
      }
    },
    [
      currentConversationId,
      createConversation,
      addMessage,
      setLoading,
      clearStreamingContent,
      setError,
      appendStreamingContent,
      isConfigured,
      config.currentModel,
      getCurrentMessages,
      updateTokenUsage,
      switchModel,
    ]
  );

  const messages = getCurrentMessages();

  return (
    <div className="flex h-full">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between px-4 py-3 border-b border-claude-border bg-claude-bg">
          <div className="flex items-center gap-3">
            <Button
              variant="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </Button>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-claude-text">
                {config.currentModel || "未选择模型"}
              </span>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSettingsOpen(true)}
          >
            设置
          </Button>
        </header>

        {error && (
          <div className="px-4 py-2 bg-red-50 border-b border-red-100 text-red-600 text-sm">
            {error}
          </div>
        )}

        <MessageList
          messages={messages}
          streamingContent={streamingContent}
          isLoading={isLoading}
        />

        <ChatInput
          onSend={handleSendMessage}
          isLoading={isLoading}
          disabled={!isConfigured()}
        />
      </div>

      <SettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
