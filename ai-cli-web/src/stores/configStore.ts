import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Config, TokenUsage } from "@/types";

const DEFAULT_CONFIG: Config = {
  apiBase: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  apiKey: "",
  modelPriority: [
    "qwen3-235b-a22b",
    "qwen3-32b",
    "qwen-plus",
    "qwen-turbo",
    "qwen-max",
  ],
  currentModel: "qwen3-235b-a22b",
};

interface ConfigState {
  config: Config;
  tokenUsage: TokenUsage;
  setApiKey: (key: string) => void;
  setApiBase: (base: string) => void;
  setCurrentModel: (model: string) => void;
  setModelPriority: (models: string[]) => void;
  switchModel: () => string | null;
  updateTokenUsage: (model: string, tokens: number) => void;
  getTodayTokenUsage: () => number;
  isConfigured: () => boolean;
}

export const useConfigStore = create<ConfigState>()(
  persist(
    (set, get) => ({
      config: DEFAULT_CONFIG,
      tokenUsage: {},

      setApiKey: (key: string) =>
        set((state) => ({
          config: { ...state.config, apiKey: key },
        })),

      setApiBase: (base: string) =>
        set((state) => ({
          config: { ...state.config, apiBase: base },
        })),

      setCurrentModel: (model: string) =>
        set((state) => ({
          config: { ...state.config, currentModel: model },
        })),

      setModelPriority: (models: string[]) =>
        set((state) => ({
          config: { ...state.config, modelPriority: models },
        })),

      switchModel: () => {
        const { config } = get();
        if (!config.modelPriority.length) return null;

        const currentIndex = config.modelPriority.indexOf(config.currentModel);
        const nextIndex = (currentIndex + 1) % config.modelPriority.length;
        const nextModel = config.modelPriority[nextIndex];

        set((state) => ({
          config: { ...state.config, currentModel: nextModel },
        }));

        return nextModel;
      },

      updateTokenUsage: (model: string, tokens: number) => {
        const today = new Date().toISOString().split("T")[0];
        set((state) => {
          const modelUsage = state.tokenUsage[model] || {};
          const todayUsage = modelUsage[today] || 0;

          return {
            tokenUsage: {
              ...state.tokenUsage,
              [model]: {
                ...modelUsage,
                [today]: todayUsage + tokens,
              },
            },
          };
        });
      },

      getTodayTokenUsage: () => {
        const { tokenUsage } = get();
        const today = new Date().toISOString().split("T")[0];
        let total = 0;

        Object.values(tokenUsage).forEach((modelUsage) => {
          if (modelUsage[today]) {
            total += modelUsage[today];
          }
        });

        return total;
      },

      isConfigured: () => {
        const { config } = get();
        return !!config.apiKey && !!config.apiBase;
      },
    }),
    {
      name: "ai-cli-config",
    }
  )
);
