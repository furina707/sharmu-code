import Conf from "conf";
const DEFAULT_CONFIG = {
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
const config = new Conf({
    projectName: "ai-cli-tui",
    defaults: {
        config: DEFAULT_CONFIG,
        tokenUsage: {},
    },
});
export function getConfig() {
    return config.get("config") || DEFAULT_CONFIG;
}
export function setConfig(newConfig) {
    const current = getConfig();
    config.set("config", { ...current, ...newConfig });
}
export function setApiKey(key) {
    setConfig({ apiKey: key });
}
export function setApiBase(base) {
    setConfig({ apiBase: base });
}
export function setCurrentModel(model) {
    setConfig({ currentModel: model });
}
export function switchModel() {
    const cfg = getConfig();
    if (!cfg.modelPriority.length)
        return null;
    const currentIndex = cfg.modelPriority.indexOf(cfg.currentModel);
    const nextIndex = (currentIndex + 1) % cfg.modelPriority.length;
    const nextModel = cfg.modelPriority[nextIndex];
    setCurrentModel(nextModel);
    return nextModel;
}
export function getTokenUsage() {
    return config.get("tokenUsage") || {};
}
export function updateTokenUsage(model, tokens) {
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
export function getTodayTokenUsage() {
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
export function isConfigured() {
    const cfg = getConfig();
    return !!cfg.apiKey && !!cfg.apiBase;
}
