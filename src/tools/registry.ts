import type { ToolDefinition } from "../llm/types.js";
import { fsTools, type ToolHandler } from "./fs.js";
import { gitTools } from "./git.js";
import { searchTools } from "./search.js";
import { createShellTool } from "./shell.js";

export class ToolRegistry {
    private handlers = new Map<string, ToolHandler>();

    constructor(skipShellApproval = false) {
        const allTools: ToolHandler[] = [
            ...fsTools,
            ...gitTools,
            ...searchTools,
            createShellTool(skipShellApproval),
        ];

        for (const tool of allTools) {
            this.handlers.set(tool.definition.function.name, tool);
        }
    }

    getDefinitions(): ToolDefinition[] {
        return Array.from(this.handlers.values()).map((h) => h.definition);
    }

    async execute(name: string, argsJson: string): Promise<string> {
        const handler = this.handlers.get(name);
        if (!handler) {
            return `Error: Unknown tool "${name}"`;
        }

        let args: Record<string, unknown> = {};
        try {
            args = JSON.parse(argsJson) as Record<string, unknown>;
        } catch {
            return `Error: Invalid JSON arguments for tool "${name}": ${argsJson}`;
        }

        try {
            return await handler.execute(args);
        } catch (err) {
            return `Error executing tool "${name}": ${err instanceof Error ? err.message : String(err)}`;
        }
    }
}
