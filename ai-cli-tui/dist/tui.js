import blessed from "blessed";
import chalk from "chalk";
import { marked } from "marked";
import TerminalRenderer from "marked-terminal";
import { chatCompletion } from "./api.js";
import { getConfig, setApiKey, setApiBase, setCurrentModel, switchModel, updateTokenUsage, getTodayTokenUsage, isConfigured, } from "./config.js";
marked.setOptions({
    renderer: new TerminalRenderer({
        code: chalk.cyan,
        blockquote: chalk.gray.italic,
        table: chalk.white,
        listitem: chalk.white,
        strong: chalk.bold.white,
        em: chalk.italic.white,
        heading: chalk.bold.yellow,
    }),
});
const messages = [];
let isLoading = false;
let currentStreamingContent = "";
let placeholderText = "Type your message... (Enter to send)";
function createScreen() {
    return blessed.screen({
        smartCSR: true,
        title: "AI CLI - Claude Style TUI",
        fullUnicode: true,
    });
}
function createHeader(screen) {
    return blessed.box({
        parent: screen,
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        content: `{center}{bold}AI CLI - Claude Style TUI{/bold}{/center}`,
        tags: true,
        border: { type: "line" },
        style: {
            border: { fg: "blue" },
            bg: "#1a1a2e",
        },
    });
}
function createStatusBar(screen) {
    const config = getConfig();
    return blessed.box({
        parent: screen,
        bottom: 3,
        left: 0,
        right: 0,
        height: 1,
        content: ` {bold}Model:{/bold} ${config.currentModel} | {bold}Tokens Today:{/bold} ${getTodayTokenUsage()} | {bold}Ctrl-H{/bold} Help | {bold}Ctrl-S{/bold} Settings | {bold}Ctrl-M{/bold} Switch Model | {bold}Ctrl-C{/bold} Quit`,
        tags: true,
        style: {
            bg: "#16213e",
            fg: "white",
        },
    });
}
function createChatBox(screen) {
    return blessed.box({
        parent: screen,
        top: 3,
        left: 0,
        right: 0,
        bottom: 4,
        scrollable: true,
        alwaysScroll: true,
        mouse: true,
        keys: true,
        vi: true,
        border: { type: "line" },
        style: {
            border: { fg: "blue" },
            bg: "#0f0f23",
        },
        scrollbar: {
            ch: " ",
            style: { bg: "blue" },
        },
    });
}
function createInputBox(screen) {
    return blessed.textarea({
        parent: screen,
        bottom: 0,
        left: 0,
        right: 0,
        height: 3,
        inputOnFocus: true,
        border: { type: "line" },
        style: {
            border: { fg: "green" },
            bg: "#1a1a2e",
            focus: {
                border: { fg: "yellow" },
            },
        },
    });
}
function createPlaceholderLabel(screen) {
    return blessed.box({
        parent: screen,
        bottom: 1,
        left: 2,
        width: "80%",
        height: 1,
        content: placeholderText,
        style: {
            fg: "gray",
        },
    });
}
function formatMessage(msg) {
    const time = new Date(msg.timestamp).toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
    });
    if (msg.role === "user") {
        return `\n${chalk.bold.cyan("┌─ You ─────────────────────────────────")}\n${chalk.white(msg.content)}\n${chalk.dim(time)}\n`;
    }
    else {
        const modelName = msg.model ? chalk.dim(` (${msg.model})`) : "";
        const rendered = marked(msg.content);
        return `\n${chalk.bold.green("┌─ Claude" + modelName + " ─────────────────────────────")}\n${rendered}\n${chalk.dim(time)}\n`;
    }
}
function updateChatBox(chatBox, streamingContent) {
    let content = "";
    for (const msg of messages) {
        content += formatMessage(msg);
    }
    if (streamingContent) {
        const streamingMsg = {
            id: "streaming",
            role: "assistant",
            content: streamingContent,
            timestamp: new Date(),
            model: getConfig().currentModel,
        };
        content += formatMessage(streamingMsg);
    }
    chatBox.setContent(content);
    chatBox.setScrollPerc(100);
    chatBox.screen.render();
}
function updatePlaceholder(placeholder, text) {
    placeholderText = text;
    placeholder.setContent(text);
    placeholder.screen.render();
}
function showHelp(screen) {
    const helpBox = blessed.box({
        parent: screen,
        top: "center",
        left: "center",
        width: "60%",
        height: "70%",
        border: { type: "line" },
        style: {
            border: { fg: "yellow" },
            bg: "#1a1a2e",
        },
        label: " Help ",
        content: `
{bold}Keyboard Shortcuts:{/bold}

  {cyan-fg}Enter{/}           Send message
  {cyan-fg}Ctrl+C{/}          Quit
  {cyan-fg}Ctrl+H{/}          Show this help
  {cyan-fg}Ctrl+S{/}          Open settings
  {cyan-fg}Ctrl+M{/}          Switch model
  {cyan-fg}Ctrl+L{/}          Clear chat
  {cyan-fg}Up/Down{/}         Scroll chat

{bold}Commands (type in input):{/bold}

  {green-fg}/help{/}           Show help
  {green-fg}/clear{/}          Clear chat history
  {green-fg}/model{/}          Show current model
  {green-fg}/switch{/}         Switch to next model
  {green-fg}/tokens{/}         Show token usage
  {green-fg}/settings{/}       Open settings
  {green-fg}/exit{/}, /quit{/}  Exit application

Press {bold}Escape{/} or {bold}q{/} to close this help.
`,
        tags: true,
        scrollable: true,
        keys: true,
    });
    helpBox.key(["escape", "q"], () => {
        helpBox.destroy();
        screen.render();
    });
    helpBox.focus();
    screen.render();
}
function showSettings(screen, chatBox, statusBar) {
    const config = getConfig();
    const settingsBox = blessed.box({
        parent: screen,
        top: "center",
        left: "center",
        width: "70%",
        height: "60%",
        border: { type: "line" },
        style: {
            border: { fg: "green" },
            bg: "#1a1a2e",
        },
        label: " Settings ",
        content: `
{bold}Current Configuration:{/bold}

  {cyan-fg}API Base:{/}     ${config.apiBase}
  {cyan-fg}API Key:{/}      ${config.apiKey ? config.apiKey.slice(0, 10) + "..." : "(not set)"}
  {cyan-fg}Current Model:{/} ${config.currentModel}
  {cyan-fg}Models:{/}       ${config.modelPriority.join(", ")}

{bold}To change settings, edit the config file:{/bold}
  {dim}${process.env.HOME || "~"}/.config/ai-cli-tui-nodejs/config.json

{bold}Or use these commands in the chat input:{/bold}
  {green-fg}/setkey <key>{/}     Set API key
  {green-fg}/setbase <url>{/}    Set API base URL
  {green-fg}/setmodel <name>{/}  Set current model

Press {bold}Escape{/} or {bold}q{/} to close.
`,
        tags: true,
        scrollable: true,
        keys: true,
    });
    settingsBox.key(["escape", "q"], () => {
        settingsBox.destroy();
        screen.render();
    });
    settingsBox.focus();
    screen.render();
}
async function handleCommand(cmd, screen, chatBox, statusBar) {
    const parts = cmd.slice(1).split(" ");
    const command = parts[0].toLowerCase();
    const args = parts.slice(1).join(" ");
    switch (command) {
        case "help":
            showHelp(screen);
            return true;
        case "clear":
            messages.length = 0;
            updateChatBox(chatBox);
            return true;
        case "model":
            const cfg = getConfig();
            chatBox.setContent(`\n{bold}Current model:{/bold} ${cfg.currentModel}\n`);
            screen.render();
            return true;
        case "switch":
            const nextModel = switchModel();
            if (nextModel) {
                statusBar.setContent(` {bold}Model:{/bold} ${nextModel} | {bold}Tokens Today:{/bold} ${getTodayTokenUsage()} | {bold}Ctrl-H{/bold} Help | {bold}Ctrl-S{/bold} Settings | {bold}Ctrl-M{/bold} Switch Model | {bold}Ctrl-C{/bold} Quit`);
                screen.render();
                chatBox.setContent(`\n{green-fg}Switched to model: ${nextModel}{/green-fg}\n`);
                screen.render();
            }
            return true;
        case "tokens":
            const usage = getTodayTokenUsage();
            chatBox.setContent(`\n{bold}Today's token usage:{/bold} ${usage.toLocaleString()} tokens\n`);
            screen.render();
            return true;
        case "settings":
            showSettings(screen, chatBox, statusBar);
            return true;
        case "setkey":
            if (args) {
                setApiKey(args);
                chatBox.setContent(`\n{green-fg}API key updated.{/green-fg}\n`);
                screen.render();
            }
            return true;
        case "setbase":
            if (args) {
                setApiBase(args);
                chatBox.setContent(`\n{green-fg}API base updated to: ${args}{/green-fg}\n`);
                screen.render();
            }
            return true;
        case "setmodel":
            if (args) {
                setCurrentModel(args);
                statusBar.setContent(` {bold}Model:{/bold} ${args} | {bold}Tokens Today:{/bold} ${getTodayTokenUsage()} | {bold}Ctrl-H{/bold} Help | {bold}Ctrl-S{/bold} Settings | {bold}Ctrl-M{/bold} Switch Model | {bold}Ctrl-C{/bold} Quit`);
                screen.render();
                chatBox.setContent(`\n{green-fg}Model set to: ${args}{/green-fg}\n`);
                screen.render();
            }
            return true;
        case "exit":
        case "quit":
            return false;
        default:
            chatBox.setContent(`\n{red-fg}Unknown command: ${command}{/red-fg}\nType /help for available commands.\n`);
            screen.render();
            return true;
    }
}
async function sendMessage(content, screen, chatBox, inputBox, placeholder, statusBar) {
    if (!isConfigured()) {
        chatBox.setContent(`\n{red-fg}Error: API key not configured.{/red-fg}\nUse /setkey <key> to set your API key.\n`);
        screen.render();
        return;
    }
    const userMessage = {
        id: `${Date.now()}-user`,
        role: "user",
        content,
        timestamp: new Date(),
    };
    messages.push(userMessage);
    updateChatBox(chatBox);
    isLoading = true;
    currentStreamingContent = "";
    updatePlaceholder(placeholder, "Waiting for response...");
    screen.render();
    try {
        const config = getConfig();
        const response = await chatCompletion(messages, config.currentModel, (chunk) => {
            currentStreamingContent += chunk;
            updateChatBox(chatBox, currentStreamingContent);
        });
        const assistantMessage = {
            id: `${Date.now()}-assistant`,
            role: "assistant",
            content: response,
            timestamp: new Date(),
            model: config.currentModel,
        };
        messages.push(assistantMessage);
        updateTokenUsage(config.currentModel, response.length);
        statusBar.setContent(` {bold}Model:{/bold} ${config.currentModel} | {bold}Tokens Today:{/bold} ${getTodayTokenUsage()} | {bold}Ctrl-H{/bold} Help | {bold}Ctrl-S{/bold} Settings | {bold}Ctrl-M{/bold} Switch Model | {bold}Ctrl-C{/bold} Quit`);
        screen.render();
    }
    catch (error) {
        const nextModel = switchModel();
        if (nextModel) {
            chatBox.setContent(`\n{red-fg}Error with model ${getConfig().currentModel}. Switched to ${nextModel}.{/red-fg}\n`);
        }
        else {
            chatBox.setContent(`\n{red-fg}Error: ${error instanceof Error ? error.message : "Unknown error"}{/red-fg}\n`);
        }
        screen.render();
    }
    finally {
        isLoading = false;
        currentStreamingContent = "";
        updatePlaceholder(placeholder, "Type your message... (Enter to send)");
        inputBox.clearValue();
        screen.render();
    }
}
export async function main() {
    const screen = createScreen();
    const header = createHeader(screen);
    const chatBox = createChatBox(screen);
    const statusBar = createStatusBar(screen);
    const inputBox = createInputBox(screen);
    const placeholder = createPlaceholderLabel(screen);
    const welcomeMsg = `
${chalk.bold.cyan("╔══════════════════════════════════════════════════════════════╗")}
${chalk.bold.cyan("║")}  ${chalk.bold.white("AI CLI - Claude Style TUI")}                                    ${chalk.bold.cyan("║")}
${chalk.bold.cyan("╚══════════════════════════════════════════════════════════════╝")}

${chalk.dim("Welcome! I'm your AI assistant with a Claude-style interface.")}
${chalk.dim("Type your message and press Enter to chat.")}
${chalk.dim("Press Ctrl+H for help, or type /help for commands.")}

${chalk.yellow("Current Model:")} ${getConfig().currentModel}
${chalk.yellow("Configured:")} ${isConfigured() ? chalk.green("Yes") : chalk.red("No - use /setkey to configure")}

`;
    chatBox.setContent(welcomeMsg);
    screen.render();
    inputBox.on("focus", () => {
        placeholder.hide();
        screen.render();
    });
    inputBox.on("blur", () => {
        if (!inputBox.getValue()) {
            placeholder.show();
            screen.render();
        }
    });
    inputBox.key("enter", async () => {
        if (isLoading)
            return;
        const content = inputBox.getValue().trim();
        if (!content)
            return;
        inputBox.clearValue();
        screen.render();
        if (content.startsWith("/")) {
            const shouldContinue = await handleCommand(content, screen, chatBox, statusBar);
            if (!shouldContinue) {
                process.exit(0);
            }
        }
        else {
            await sendMessage(content, screen, chatBox, inputBox, placeholder, statusBar);
        }
        inputBox.focus();
    });
    screen.key(["C-c"], () => {
        process.exit(0);
    });
    screen.key(["C-h"], () => {
        showHelp(screen);
    });
    screen.key(["C-s"], () => {
        showSettings(screen, chatBox, statusBar);
    });
    screen.key(["C-m"], async () => {
        if (isLoading)
            return;
        const nextModel = switchModel();
        if (nextModel) {
            statusBar.setContent(` {bold}Model:{/bold} ${nextModel} | {bold}Tokens Today:{/bold} ${getTodayTokenUsage()} | {bold}Ctrl-H{/bold} Help | {bold}Ctrl-S{/bold} Settings | {bold}Ctrl-M{/bold} Switch Model | {bold}Ctrl-C{/bold} Quit`);
            screen.render();
        }
    });
    screen.key(["C-l"], () => {
        messages.length = 0;
        updateChatBox(chatBox);
    });
    inputBox.focus();
    screen.render();
}
