import type { Message, StreamChunk } from "@/types";

class AIService {
  private getApiBase(): string {
    const stored = localStorage.getItem("ai-cli-config");
    if (stored) {
      const config = JSON.parse(stored);
      return config.state?.config?.apiBase || "";
    }
    return "";
  }

  private getApiKey(): string {
    const stored = localStorage.getItem("ai-cli-config");
    if (stored) {
      const config = JSON.parse(stored);
      return config.state?.config?.apiKey || "";
    }
    return "";
  }

  private getHeaders(): HeadersInit {
    return {
      Authorization: `Bearer ${this.getApiKey()}`,
      "Content-Type": "application/json",
    };
  }

  async getModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.getApiBase()}/models`, {
        method: "GET",
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`获取模型列表失败: ${response.status}`);
      }

      const data = await response.json();
      return data.data?.map((model: { id: string }) => model.id) || [];
    } catch (error) {
      console.error("获取模型列表失败:", error);
      return [];
    }
  }

  async chatCompletion(
    messages: Message[],
    model: string,
    onChunk?: (chunk: string) => void
  ): Promise<string> {
    const formattedMessages = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const response = await fetch(`${this.getApiBase()}/chat/completions`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        model,
        messages: formattedMessages,
        temperature: 0.7,
        stream: !!onChunk,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`请求失败: ${response.status} - ${errorText}`);
    }

    if (onChunk && response.body) {
      return this.handleStreamResponse(response.body, onChunk);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "";
  }

  private async handleStreamResponse(
    body: ReadableStream<Uint8Array>,
    onChunk: (chunk: string) => void
  ): Promise<string> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let fullContent = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n").filter((line) => line.trim() !== "");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") continue;

          try {
            const parsed: StreamChunk = JSON.parse(data);
            const content = parsed.choices[0]?.delta?.content || "";
            if (content) {
              fullContent += content;
              onChunk(content);
            }
          } catch {
            continue;
          }
        }
      }
    }

    return fullContent;
  }

  async chatCompletionNonStream(messages: Message[], model: string): Promise<string> {
    return this.chatCompletion(messages, model);
  }
}

export const aiService = new AIService();
