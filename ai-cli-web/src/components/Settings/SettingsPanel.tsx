import { motion, AnimatePresence } from "framer-motion";
import { X, Save, Eye, EyeOff, Trash2, BarChart3 } from "lucide-react";
import { useState } from "react";
import { useConfigStore } from "@/stores/configStore";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const {
    config,
    tokenUsage,
    setApiKey,
    setApiBase,
    setModelPriority,
    getTodayTokenUsage,
  } = useConfigStore();

  const [apiKeyInput, setApiKeyInput] = useState(config.apiKey);
  const [apiBaseInput, setApiBaseInput] = useState(config.apiBase);
  const [modelsInput, setModelsInput] = useState(config.modelPriority.join("\n"));
  const [showApiKey, setShowApiKey] = useState(false);

  const handleSave = () => {
    setApiKey(apiKeyInput);
    setApiBase(apiBaseInput);
    const models = modelsInput
      .split("\n")
      .map((m) => m.trim())
      .filter(Boolean);
    setModelPriority(models);
    onClose();
  };

  const handleClearTokenUsage = () => {
    localStorage.removeItem("ai-cli-config-token-usage");
    window.location.reload();
  };

  const todayUsage = getTodayTokenUsage();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 z-40"
            onClick={onClose}
          />

          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-claude-bg border-l border-claude-border z-50 overflow-y-auto"
          >
            <div className="flex items-center justify-between p-4 border-b border-claude-border">
              <h2 className="text-lg font-semibold text-claude-text">设置</h2>
              <Button variant="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="p-4 space-y-6">
              <section>
                <h3 className="text-sm font-medium text-claude-text mb-3">
                  API 配置
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-claude-textSecondary mb-1">
                      API Base URL
                    </label>
                    <Input
                      value={apiBaseInput}
                      onChange={(e) => setApiBaseInput(e.target.value)}
                      placeholder="https://api.example.com/v1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-claude-textSecondary mb-1">
                      API Key
                    </label>
                    <div className="relative">
                      <Input
                        type={showApiKey ? "text" : "password"}
                        value={apiKeyInput}
                        onChange={(e) => setApiKeyInput(e.target.value)}
                        placeholder="sk-..."
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-claude-textSecondary hover:text-claude-text"
                      >
                        {showApiKey ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-claude-textSecondary mb-1">
                      模型优先级列表（每行一个）
                    </label>
                    <textarea
                      value={modelsInput}
                      onChange={(e) => setModelsInput(e.target.value)}
                      placeholder="qwen-plus&#10;qwen-turbo&#10;qwen-max"
                      rows={5}
                      className="w-full px-4 py-3 bg-claude-input border border-claude-border rounded-xl text-claude-text placeholder:text-claude-textSecondary focus:outline-none focus:ring-2 focus:ring-claude-accent/30 focus:border-claude-accent transition-all duration-200 resize-none font-mono text-sm"
                    />
                  </div>
                </div>
              </section>

              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-claude-text flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Token 使用统计
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearTokenUsage}
                    className="text-xs"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    清除
                  </Button>
                </div>

                <div className="bg-claude-sidebar rounded-xl p-4">
                  <div className="text-center mb-4">
                    <div className="text-3xl font-bold text-claude-accent">
                      {todayUsage.toLocaleString()}
                    </div>
                    <div className="text-sm text-claude-textSecondary">
                      今日使用
                    </div>
                  </div>

                  <div className="space-y-2">
                    {Object.entries(tokenUsage).map(([model, usage]) => {
                      const today = new Date().toISOString().split("T")[0];
                      const todayTokens = usage[today] || 0;
                      if (todayTokens === 0) return null;

                      return (
                        <div
                          key={model}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="text-claude-textSecondary truncate">
                            {model}
                          </span>
                          <span className="text-claude-text font-medium">
                            {todayTokens.toLocaleString()}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>

              <div className="pt-4 border-t border-claude-border">
                <Button onClick={handleSave} className="w-full">
                  <Save className="w-4 h-4 mr-2" />
                  保存设置
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
