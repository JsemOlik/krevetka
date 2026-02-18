import { input, select, confirm } from "@inquirer/prompts";
import chalk from "chalk";

export interface ProjectContext {
    name: string;
    description: string;
    techStack: string;
    colorScheme: string;
    targetPlatform: string;
    additionalNotes: string;
}

export async function runPlanMode(): Promise<string> {
    console.log(
        chalk.bold.cyan("\n🦐 Krevetka Plan Mode\n") +
        chalk.dim("Let's gather some context about your project before we start.\n")
    );

    const ctx: ProjectContext = {
        name: "",
        description: "",
        techStack: "",
        colorScheme: "",
        targetPlatform: "",
        additionalNotes: "",
    };

    ctx.name = await input({
        message: "Project name:",
        default: "my-project",
    });

    ctx.description = await input({
        message: "What does this project do? (brief description)",
    });

    const techChoice = await select({
        message: "Primary tech stack:",
        choices: [
            { name: "TypeScript / Node.js", value: "TypeScript/Node.js" },
            { name: "TypeScript / React (Vite)", value: "TypeScript/React with Vite" },
            { name: "TypeScript / Next.js", value: "TypeScript/Next.js" },
            { name: "Python", value: "Python" },
            { name: "Rust", value: "Rust" },
            { name: "Go", value: "Go" },
            { name: "Other (describe below)", value: "other" },
        ],
    });

    if (techChoice === "other") {
        ctx.techStack = await input({ message: "Describe your tech stack:" });
    } else {
        ctx.techStack = techChoice;
    }

    const platformChoice = await select({
        message: "Target platform:",
        choices: [
            { name: "Web (browser)", value: "web" },
            { name: "CLI / Terminal", value: "cli" },
            { name: "Desktop (Electron/Tauri)", value: "desktop" },
            { name: "Mobile (React Native/Expo)", value: "mobile" },
            { name: "API / Backend service", value: "backend" },
            { name: "Library / Package", value: "library" },
        ],
    });
    ctx.targetPlatform = platformChoice;

    const needsUI = ["web", "desktop", "mobile"].includes(platformChoice);
    if (needsUI) {
        const colorChoice = await select({
            message: "Color scheme / design vibe:",
            choices: [
                { name: "Dark mode (default)", value: "dark mode with neutral grays and accent colors" },
                { name: "Light & minimal", value: "light, minimal, clean white with subtle shadows" },
                { name: "Vibrant / colorful", value: "vibrant, colorful, energetic palette" },
                { name: "Glassmorphism / frosted", value: "glassmorphism with frosted glass effects and blur" },
                { name: "Cyberpunk / neon", value: "cyberpunk aesthetic with neon colors on dark background" },
                { name: "Custom (describe below)", value: "custom" },
            ],
        });

        if (colorChoice === "custom") {
            ctx.colorScheme = await input({ message: "Describe your color scheme:" });
        } else {
            ctx.colorScheme = colorChoice;
        }
    }

    ctx.additionalNotes = await input({
        message: "Any other important context? (press Enter to skip)",
        default: "",
    });

    const confirmed = await confirm({
        message: "Start coding with this context?",
        default: true,
    });

    if (!confirmed) {
        console.log(chalk.yellow("Plan mode cancelled. Starting without project context."));
        return "";
    }

    return buildProjectContext(ctx);
}

function buildProjectContext(ctx: ProjectContext): string {
    const lines = [
        `**Project Name**: ${ctx.name}`,
        `**Description**: ${ctx.description}`,
        `**Tech Stack**: ${ctx.techStack}`,
        `**Target Platform**: ${ctx.targetPlatform}`,
    ];

    if (ctx.colorScheme) {
        lines.push(`**Design / Color Scheme**: ${ctx.colorScheme}`);
    }

    if (ctx.additionalNotes) {
        lines.push(`**Additional Notes**: ${ctx.additionalNotes}`);
    }

    return lines.join("\n");
}
