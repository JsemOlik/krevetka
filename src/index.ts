import { Command } from "commander";
import chalk from "chalk";
import { loadConfig } from "./config/loader.js";
import { createClient } from "./llm/client.js";
import { buildSystemPrompt } from "./prompts/system.js";
import { runPlanMode } from "./agent/planner.js";
import { AgentLoop } from "./agent/loop.js";
import { Renderer } from "./ui/renderer.js";
import { InputHandler } from "./ui/input.js";
import fs from "fs";
import path from "path";

const program = new Command();

program
    .name("krevetka")
    .description("AI coding assistant for any OpenAI-compatible endpoint")
    .version("0.1.0")
    .option("-m, --model <model>", "Model to use")
    .option("-u, --base-url <url>", "API base URL")
    .option("-k, --api-key <key>", "API key")
    .option("--max-tokens <n>", "Max tokens per response", parseInt)
    .option("--plan", "Run plan mode on startup (project Q&A)")
    .option("--yolo", "Skip shell command approval prompts (dangerous!)")
    .option("--config", "Show current configuration and exit")
    .parse(process.argv);

const opts = program.opts<{
    model?: string;
    baseUrl?: string;
    apiKey?: string;
    maxTokens?: number;
    plan?: boolean;
    yolo?: boolean;
    config?: boolean;
}>();

async function main() {
    const config = loadConfig({
        baseUrl: opts.baseUrl,
        apiKey: opts.apiKey,
        model: opts.model,
        maxTokens: opts.maxTokens,
    });

    const renderer = new Renderer();

    // --config flag: show config and exit
    if (opts.config) {
        renderer.printConfig(config as unknown as Record<string, unknown>);
        process.exit(0);
    }

    // Validate we have something to connect to
    if (!config.apiKey && !config.baseUrl.includes("localhost") && !config.baseUrl.includes("127.0.0.1")) {
        console.error(
            chalk.red("✗ No API key configured.\n") +
            chalk.dim("Set KREVETKA_API_KEY, OPENROUTER_API_KEY, or add apiKey to .krevetka.json\n") +
            chalk.dim("Run: krevetka --config to see current settings")
        );
        process.exit(1);
    }

    renderer.printWelcome(config.model, config.baseUrl);

    // Plan mode
    let projectContext: string | undefined;
    const shouldRunPlan = opts.plan || isNewProject();

    if (shouldRunPlan) {
        try {
            projectContext = await runPlanMode();
        } catch (err) {
            // User cancelled (Ctrl+C)
            console.log(chalk.dim("\nPlan mode skipped."));
        }
    }

    const systemPrompt = buildSystemPrompt(config, projectContext);
    const client = createClient(config);
    const agent = new AgentLoop(client, config, systemPrompt, opts.yolo ?? false);
    const input = new InputHandler();

    // Handle Ctrl+C gracefully
    process.on("SIGINT", () => {
        console.log(chalk.dim("\n\nUse /exit to quit."));
    });

    // Main REPL loop
    while (true) {
        let userInput: string | null;

        try {
            userInput = await input.prompt();
        } catch {
            break;
        }

        if (userInput === null) {
            // EOF (Ctrl+D)
            console.log(chalk.dim("\nGoodbye! 🦐"));
            break;
        }

        if (!userInput.trim()) continue;

        // Handle slash commands
        const command = userInput.trim().toLowerCase();

        if (command === "/exit" || command === "/quit") {
            console.log(chalk.dim("\nGoodbye! 🦐"));
            break;
        }

        if (command === "/help") {
            renderer.printHelp();
            continue;
        }

        if (command === "/clear") {
            agent.clearContext();
            console.clear();
            renderer.printWelcome(config.model, config.baseUrl);
            renderer.printInfo("Conversation cleared.");
            continue;
        }

        if (command === "/config") {
            renderer.printConfig(config as unknown as Record<string, unknown>);
            continue;
        }

        if (command === "/plan") {
            try {
                const newContext = await runPlanMode();
                if (newContext) {
                    const newSystemPrompt = buildSystemPrompt(config, newContext);
                    // Recreate agent with new system prompt
                    Object.assign(agent, new AgentLoop(client, config, newSystemPrompt, opts.yolo ?? false));
                    renderer.printInfo("Project context updated.");
                }
            } catch {
                renderer.printInfo("Plan mode cancelled.");
            }
            continue;
        }

        // Run the agent
        try {
            await agent.run(userInput);
        } catch (err) {
            renderer.printError(
                err instanceof Error ? err.message : String(err)
            );
        }
    }

    input.close();
    process.exit(0);
}

function isNewProject(): boolean {
    // Auto-trigger plan mode if the project directory looks empty/new
    try {
        const entries = fs.readdirSync(process.cwd()).filter(
            (e) => !e.startsWith(".") && e !== "node_modules"
        );
        return entries.length === 0;
    } catch {
        return false;
    }
}

main().catch((err) => {
    console.error(chalk.red("Fatal error:"), err);
    process.exit(1);
});
