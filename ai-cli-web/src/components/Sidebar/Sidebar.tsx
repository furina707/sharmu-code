import { motion, AnimatePresence } from "framer-motion";
import { Plus, MessageSquare, Trash2, Settings, ChevronDown } from "lucide-react";
import { useState } from "react";
import { useChatStore } from "@/stores/chatStore";
import { useConfigStore } from "@/stores/configStore";
import { Button } from "@/components/ui/Button";
import { cn, formatDate } from "@/lib/utils";
import type { Conversation } from "@/types";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
}

export function Sidebar({ isOpen, onClose, onOpenSettings }: SidebarProps) {
  const {
    conversations,
    currentConversationId,
    createConversation,
    deleteConversation,
    selectConversation,
  } = useChatStore();

  const { config, setCurrentModel } = useConfigStore();
  const [showModelSelector, setShowModelSelector] = useState(false);

  const handleNewChat = () => {
    createConversation();
    onClose();
  };

  const handleSelectConversation = (id: string) => {
    selectConversation(id);
    onClose();
  };

  const handleDeleteConversation = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteConversation(id);
  };

  const groupedConversations = groupConversationsByDate(conversations);

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 z-40 lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{
          x: isOpen ? 0 : -280,
          width: 280,
        }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className={cn(
          "fixed lg:relative left-0 top-0 h-full z-50",
          "bg-claude-sidebar border-r border-claude-border",
          "flex flex-col"
        )}
      >
        <div className="p-4 border-b border-claude-border">
          <Button
            variant="secondary"
            className="w-full justify-start gap-2"
            onClick={handleNewChat}
          >
            <Plus className="w-4 h-4" />
            新对话
          </Button>
        </div>

        <div className="p-4 border-b border-claude-border">
          <button
            onClick={() => setShowModelSelector(!showModelSelector)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-claude-bg border border-claude-border hover:border-claude-accent/50 transition-colors"
          >
            <span className="text-sm text-claude-text truncate">
              {config.currentModel || "选择模型"}
            </span>
            <ChevronDown
              className={cn(
                "w-4 h-4 text-claude-textSecondary transition-transform",
                showModelSelector && "rotate-180"
              )}
            />
          </button>

          <AnimatePresence>
            {showModelSelector && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-2 bg-claude-bg border border-claude-border rounded-xl overflow-hidden shadow-claude"
              >
                {config.modelPriority.map((model) => (
                  <button
                    key={model}
                    onClick={() => {
                      setCurrentModel(model);
                      setShowModelSelector(false);
                    }}
                    className={cn(
                      "w-full px-3 py-2 text-left text-sm hover:bg-claude-sidebar transition-colors",
                      model === config.currentModel && "bg-claude-sidebar text-claude-accent font-medium"
                    )}
                  >
                    {model}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {Object.entries(groupedConversations).map(([date, convs]) => (
            <div key={date} className="mb-4">
              <h3 className="px-3 py-1 text-xs font-medium text-claude-textSecondary uppercase">
                {date}
              </h3>
              <div className="space-y-1">
                {convs.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv.id)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left group transition-colors",
                      conv.id === currentConversationId
                        ? "bg-claude-bg shadow-claude"
                        : "hover:bg-claude-bg/50"
                    )}
                  >
                    <MessageSquare className="w-4 h-4 text-claude-textSecondary flex-shrink-0" />
                    <span className="flex-1 text-sm text-claude-text truncate">
                      {conv.title}
                    </span>
                    <button
                      onClick={(e) => handleDeleteConversation(e, conv.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-claude-border rounded transition-all"
                    >
                      <Trash2 className="w-3 h-3 text-claude-textSecondary" />
                    </button>
                  </button>
                ))}
              </div>
            </div>
          ))}

          {conversations.length === 0 && (
            <div className="text-center py-8 text-claude-textSecondary text-sm">
              暂无对话记录
            </div>
          )}
        </div>

        <div className="p-4 border-t border-claude-border">
          <Button
            variant="ghost"
            className="w-full justify-start gap-2"
            onClick={onOpenSettings}
          >
            <Settings className="w-4 h-4" />
            设置
          </Button>
        </div>
      </motion.aside>
    </>
  );
}

function groupConversationsByDate(
  conversations: Conversation[]
): Record<string, Conversation[]> {
  const groups: Record<string, Conversation[]> = {};

  conversations.forEach((conv) => {
    const date = formatDate(new Date(conv.createdAt));
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(conv);
  });

  return groups;
}
