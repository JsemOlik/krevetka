import fs from "fs";
import os from "os";
import path from "path";
import { ConfigSchema, type Config } from "./schema.js";

function loadJsonFile(filePath: string): Record<string, unknown> {
    try {
        const raw = fs.readFileSync(filePath, "utf-8");
        return JSON.parse(raw) as Record<string, unknown>;
    } catch {
        return {};
    }
}

export interface CliOverrides {
    baseUrl?: string;
    apiKey?: string;
    model?: string;
    maxTokens?: number;
}

export function loadConfig(overrides: CliOverrides = {}): Config {
    // Priority (highest → lowest):
    // 1. CLI flags
    // 2. .krevetka.json in cwd
    // 3. ~/.krevetka/config.json
    // 4. Environment variables
    // 5. Schema defaults

    const globalConfigPath = path.join(os.homedir(), ".krevetka", "config.json");
    const projectConfigPath = path.join(process.cwd(), ".krevetka.json");

    const globalConfig = loadJsonFile(globalConfigPath);
    const projectConfig = loadJsonFile(projectConfigPath);

    const envConfig: Record<string, unknown> = {};
    if (process.env["KREVETKA_BASE_URL"]) envConfig["baseUrl"] = process.env["KREVETKA_BASE_URL"];
    if (process.env["KREVETKA_API_KEY"]) envConfig["apiKey"] = process.env["KREVETKA_API_KEY"];
    if (process.env["KREVETKA_MODEL"]) envConfig["model"] = process.env["KREVETKA_MODEL"];
    if (process.env["OPENROUTER_API_KEY"] && !envConfig["apiKey"]) {
        envConfig["apiKey"] = process.env["OPENROUTER_API_KEY"];
    }
    if (process.env["OPENAI_API_KEY"] && !envConfig["apiKey"]) {
        envConfig["apiKey"] = process.env["OPENAI_API_KEY"];
    }

    const merged = {
        ...globalConfig,
        ...envConfig,
        ...projectConfig,
        ...Object.fromEntries(
            Object.entries(overrides).filter(([, v]) => v !== undefined)
        ),
    };

    const result = ConfigSchema.safeParse(merged);
    if (!result.success) {
        console.error("Invalid configuration:", result.error.format());
        process.exit(1);
    }

    return result.data;
}
