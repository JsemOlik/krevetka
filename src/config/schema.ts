import { z } from "zod";

export const ConfigSchema = z.object({
    baseUrl: z
        .string()
        .url()
        .default("https://openrouter.ai/api/v1"),
    apiKey: z.string().default(""),
    model: z.string().default("anthropic/claude-3.5-sonnet"),
    maxTokens: z.number().int().positive().default(8192),
    systemPromptExtra: z.string().default(""),
});

export type Config = z.infer<typeof ConfigSchema>;
