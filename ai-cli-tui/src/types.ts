export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  model?: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Config {
  apiBase: string;
  apiKey: string;
  modelPriority: string[];
  currentModel: string;
}

export interface TokenUsage {
  [model: string]: {
    [date: string]: number;
  };
}

export interface StreamChunk {
  id: string;
  choices: Array<{
    delta: {
      content?: string;
      role?: string;
    };
    finish_reason: string | null;
  }>;
}
