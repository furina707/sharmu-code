import type { Message, StreamChunk } from "./types.js";
import { getConfig } from "./config.js";

export async function getModels(): Promise<string[]> {
  const config = getConfig();
  try {
    const response = await fetch(`${config.apiBase}/models`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
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

export async function chatCompletion(
  messages: Message[],
  model: string,
  onChunk?: (chunk: string) => void
): Promise<string> {
  const config = getConfig();

  const formattedMessages = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const response = await fetch(`${config.apiBase}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
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
    return handleStreamResponse(response.body, onChunk);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || "";
}

async function handleStreamResponse(
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
