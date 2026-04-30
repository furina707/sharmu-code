import type { Message } from "./types.js";
export declare function getModels(): Promise<string[]>;
export declare function chatCompletion(messages: Message[], model: string, onChunk?: (chunk: string) => void): Promise<string>;
