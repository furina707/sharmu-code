import Conf from "conf";
import type { Config, TokenUsage } from "./types.js";

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

const config = new Conf<{
  config: Config;
  tokenUsage: TokenUsage;
}>({
  projectName: "ai-cli-tui",
  defaults: {
    config: DEFAULT_CONFIG,
    tokenUsage: {},
  },
});

export function getConfig(): Config {
  return config.get("config") || DEFAULT_CONFIG;
}

export function setConfig(newConfig: Partial<Config>): void {
  const current = getConfig();
  config.set("config", { ...current, ...newConfig });
}

export function setApiKey(key: string): void {
  setConfig({ apiKey: key });
}

export function setApiBase(base: string): void {
  setConfig({ apiBase: base });
}

export function setCurrentModel(model: string): void {
  setConfig({ currentModel: model });
}

export function switchModel(): string | null {
  const cfg = getConfig();
  if (!cfg.modelPriority.length) return null;

  const currentIndex = cfg.modelPriority.indexOf(cfg.currentModel);
  const nextIndex = (currentIndex + 1) % cfg.modelPriority.length;
  const nextModel = cfg.modelPriority[nextIndex];

  setCurrentModel(nextModel);
  return nextModel;
}

export function getTokenUsage(): TokenUsage {
  return config.get("tokenUsage") || {};
}

export function updateTokenUsage(model: string, tokens: number): void {
  const today = new Date().toISOString().split("T")[0];
  const usage = getTokenUsage();

  if (!usage[model]) {
    usage[model] = {};
  }
  if (!usage[model][today]) {
    usage[model][today] = 0;
  }
  usage[model][today] += tokens;

  config.set("tokenUsage", usage);
}

export function getTodayTokenUsage(): number {
  const usage = getTokenUsage();
  const today = new Date().toISOString().split("T")[0];
  let total = 0;

  Object.values(usage).forEach((modelUsage) => {
    if (modelUsage[today]) {
      total += modelUsage[today];
    }
  });

  return total;
}

export function isConfigured(): boolean {
  const cfg = getConfig();
  return !!cfg.apiKey && !!cfg.apiBase;
}
