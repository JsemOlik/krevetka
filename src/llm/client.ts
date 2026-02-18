import OpenAI from "openai";
import type { Config } from "../config/schema.js";
import type { Message, ToolDefinition } from "./types.js";

export type StreamChunk =
    | { type: "text"; delta: string }
    | { type: "tool_call_start"; id: string; name: string }
    | { type: "tool_call_args"; id: string; delta: string }
    | { type: "tool_call_end"; id: string }
    | { type: "done" }
    | { type: "error"; error: Error };

export function createClient(config: Config): OpenAI {
    return new OpenAI({
        baseURL: config.baseUrl,
        apiKey: config.apiKey || "no-key",
        defaultHeaders: {
            "HTTP-Referer": "https://github.com/krevetka",
            "X-Title": "Krevetka",
        },
    });
}

export async function* streamCompletion(
    client: OpenAI,
    config: Config,
    messages: Message[],
    tools: ToolDefinition[]
): AsyncGenerator<StreamChunk> {
    try {
        const stream = await client.chat.completions.create({
            model: config.model,
            max_tokens: config.maxTokens,
            messages: messages as OpenAI.Chat.ChatCompletionMessageParam[],
            tools: tools.length > 0
                ? (tools as OpenAI.Chat.ChatCompletionTool[])
                : undefined,
            tool_choice: tools.length > 0 ? "auto" : undefined,
            stream: true,
        });

        const toolCallBuffers: Record<string, { name: string; args: string }> = {};

        for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta;
            if (!delta) continue;

            // Text content
            if (delta.content) {
                yield { type: "text", delta: delta.content };
            }

            // Tool calls
            if (delta.tool_calls) {
                for (const tc of delta.tool_calls) {
                    const idx = tc.index;
                    const id = tc.id ?? `tc_${idx}`;

                    if (tc.function?.name) {
                        // First chunk for this tool call
                        toolCallBuffers[id] = { name: tc.function.name, args: "" };
                        yield { type: "tool_call_start", id, name: tc.function.name };
                    }

                    if (tc.function?.arguments) {
                        const buf = toolCallBuffers[id];
                        if (buf) {
                            buf.args += tc.function.arguments;
                            yield { type: "tool_call_args", id, delta: tc.function.arguments };
                        }
                    }
                }
            }

            // Finish reason
            const finishReason = chunk.choices[0]?.finish_reason;
            if (finishReason === "tool_calls") {
                for (const id of Object.keys(toolCallBuffers)) {
                    yield { type: "tool_call_end", id };
                }
            }
        }

        yield { type: "done" };
    } catch (err) {
        yield { type: "error", error: err instanceof Error ? err : new Error(String(err)) };
    }
}
