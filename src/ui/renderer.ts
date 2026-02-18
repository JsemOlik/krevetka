import chalk from "chalk";
import type { StreamChunk } from "../llm/client.js";
import type { Message } from "../llm/types.js";

export class Renderer {
    private currentToolName: string | null = null;
    private currentToolArgs: string = "";
    private inToolCall = false;

    printWelcome(model: string, baseUrl: string): void {
        console.log(
            chalk.bold.cyan("🦐 Krevetka") +
            chalk.dim(` — ${model}`) +
            chalk.dim(` @ ${baseUrl}`)
        );
        console.log(chalk.dim("Type your message. /help for commands, /exit to quit.\n"));
    }

    printUserPrompt(): void {
        process.stdout.write(chalk.bold.green("\n▶ "));
    }

    printAssistantStart(): void {
        process.stdout.write(chalk.bold.cyan("\n🦐 "));
    }

    handleStreamChunk(chunk: StreamChunk): void {
        switch (chunk.type) {
            case "text":
                process.stdout.write(chunk.delta);
                break;

            case "tool_call_start":
                this.inToolCall = true;
                this.currentToolName = chunk.name;
                this.currentToolArgs = "";
                process.stdout.write(
                    `\n${chalk.bold.yellow("⚙")} ${chalk.yellow(chunk.name)}${chalk.dim("(")}`
                );
                break;

            case "tool_call_args":
                this.currentToolArgs += chunk.delta;
                // Show args inline but keep it compact
                process.stdout.write(chalk.dim(chunk.delta));
                break;

            case "tool_call_end":
                process.stdout.write(chalk.dim(")"));
                this.inToolCall = false;
                this.currentToolName = null;
                this.currentToolArgs = "";
                break;

            case "error":
                process.stdout.write(
                    `\n${chalk.red("✗ Error:")} ${chunk.error.message}\n`
                );
                break;

            case "done":
                process.stdout.write("\n");
                break;
        }
    }

    printToolResult(name: string, result: string): void {
        const preview = result.length > 200 ? result.slice(0, 200) + "…" : result;
        const lines = preview.split("\n").slice(0, 8);
        const truncated = lines.join("\n");
        console.log(
            chalk.dim(`  └─ ${name}: `) +
            chalk.dim(truncated.replace(/\n/g, "\n     "))
        );
    }

    printError(message: string): void {
        console.error(chalk.red(`\n✗ ${message}`));
    }

    printInfo(message: string): void {
        console.log(chalk.dim(`\n${message}`));
    }

    printHelp(): void {
        console.log(`
${chalk.bold("Commands:")}
  ${chalk.cyan("/help")}     Show this help message
  ${chalk.cyan("/clear")}    Clear conversation history
  ${chalk.cyan("/plan")}     Run plan mode (project Q&A)
  ${chalk.cyan("/config")}   Show current configuration
  ${chalk.cyan("/exit")}     Exit Krevetka
  ${chalk.cyan("/quit")}     Exit Krevetka

${chalk.bold("Tips:")}
  • End a line with ${chalk.cyan("\\")} to continue on the next line
  • Use ${chalk.cyan("Ctrl+C")} to cancel the current response
    `);
    }

    printConfig(config: Record<string, unknown>): void {
        console.log(chalk.bold("\nCurrent configuration:"));
        for (const [key, value] of Object.entries(config)) {
            const displayValue = key === "apiKey"
                ? (String(value).slice(0, 8) + "…")
                : String(value);
            console.log(`  ${chalk.cyan(key)}: ${displayValue}`);
        }
        console.log();
    }
}
