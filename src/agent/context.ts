import type { Message } from "../llm/types.js";

const MAX_MESSAGES = 100; // Keep last N messages to avoid context overflow

export class ConversationContext {
    private messages: Message[] = [];
    private systemPrompt: string;

    constructor(systemPrompt: string) {
        this.systemPrompt = systemPrompt;
    }

    addUser(content: string): void {
        this.messages.push({ role: "user", content });
        this.trim();
    }

    addAssistant(content: string | null, toolCalls?: Message["tool_calls"]): void {
        this.messages.push({
            role: "assistant",
            content,
            ...(toolCalls && toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
        });
    }

    addToolResult(toolCallId: string, name: string, result: string): void {
        this.messages.push({
            role: "tool",
            tool_call_id: toolCallId,
            name,
            content: result,
        });
    }

    getMessages(): Message[] {
        return [
            { role: "system", content: this.systemPrompt },
            ...this.messages,
        ];
    }

    private trim(): void {
        if (this.messages.length > MAX_MESSAGES) {
            // Keep the first message (often important context) and the last N-1
            const keep = MAX_MESSAGES - 1;
            this.messages = [
                this.messages[0]!,
                ...this.messages.slice(-keep),
            ];
        }
    }

    clear(): void {
        this.messages = [];
    }

    get length(): number {
        return this.messages.length;
    }
}
