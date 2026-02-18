import ora from "ora";
import chalk from "chalk";
import type OpenAI from "openai";
import { streamCompletion } from "../llm/client.js";
import type { Message, ToolCall } from "../llm/types.js";
import type { Config } from "../config/schema.js";
import { ConversationContext } from "./context.js";
import { ToolRegistry } from "../tools/registry.js";
import { Renderer } from "../ui/renderer.js";

const MAX_TOOL_ROUNDS = 20; // Safety limit on tool call loops

export class AgentLoop {
    private context: ConversationContext;
    private registry: ToolRegistry;
    private renderer: Renderer;
    private client: OpenAI;
    private config: Config;

    constructor(
        client: OpenAI,
        config: Config,
        systemPrompt: string,
        skipShellApproval = false
    ) {
        this.client = client;
        this.config = config;
        this.context = new ConversationContext(systemPrompt);
        this.registry = new ToolRegistry(skipShellApproval);
        this.renderer = new Renderer();
    }

    async run(userMessage: string): Promise<void> {
        this.context.addUser(userMessage);

        let toolRounds = 0;

        while (toolRounds < MAX_TOOL_ROUNDS) {
            const spinner = ora({
                text: chalk.dim("Thinking…"),
                spinner: "dots",
                color: "cyan",
            }).start();

            // Collect the full response
            const textParts: string[] = [];
            const toolCalls: ToolCall[] = [];
            const toolCallBuffers: Record<string, { name: string; args: string }> = {};
            let hasStartedOutput = false;

            try {
                const stream = streamCompletion(
                    this.client,
                    this.config,
                    this.context.getMessages(),
                    this.registry.getDefinitions()
                );

                for await (const chunk of stream) {
                    if (!hasStartedOutput && (chunk.type === "text" || chunk.type === "tool_call_start")) {
                        spinner.stop();
                        hasStartedOutput = true;
                        this.renderer.printAssistantStart();
                    }

                    this.renderer.handleStreamChunk(chunk);

                    switch (chunk.type) {
                        case "text":
                            textParts.push(chunk.delta);
                            break;

                        case "tool_call_start":
                            toolCallBuffers[chunk.id] = { name: chunk.name, args: "" };
                            break;

                        case "tool_call_args":
                            if (toolCallBuffers[chunk.id]) {
                                toolCallBuffers[chunk.id]!.args += chunk.delta;
                            }
                            break;

                        case "tool_call_end": {
                            const buf = toolCallBuffers[chunk.id];
                            if (buf) {
                                toolCalls.push({
                                    id: chunk.id,
                                    type: "function",
                                    function: { name: buf.name, arguments: buf.args },
                                });
                            }
                            break;
                        }

                        case "error":
                            spinner.stop();
                            this.renderer.printError(chunk.error.message);
                            return;
                    }
                }
            } finally {
                spinner.stop();
            }

            const assistantText = textParts.join("") || null;

            // Add assistant message to context
            this.context.addAssistant(
                assistantText,
                toolCalls.length > 0 ? toolCalls : undefined
            );

            // If no tool calls, we're done
            if (toolCalls.length === 0) {
                break;
            }

            // Execute tool calls
            toolRounds++;
            for (const tc of toolCalls) {
                const result = await this.registry.execute(
                    tc.function.name,
                    tc.function.arguments
                );
                this.renderer.printToolResult(tc.function.name, result);
                this.context.addToolResult(tc.id, tc.function.name, result);
            }
        }

        if (toolRounds >= MAX_TOOL_ROUNDS) {
            this.renderer.printError(`Reached maximum tool call rounds (${MAX_TOOL_ROUNDS}). Stopping.`);
        }
    }

    clearContext(): void {
        this.context.clear();
    }

    get renderer_(): Renderer {
        return this.renderer;
    }
}
