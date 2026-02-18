import { execFile, spawn } from "child_process";
import { promisify } from "util";
import type { ToolHandler } from "./fs.js";

const execFileAsync = promisify(execFile);

export const gitTools: ToolHandler[] = [
    {
        definition: {
            type: "function",
            function: {
                name: "git_status",
                description: "Show the working tree status (staged, unstaged, untracked files).",
                parameters: {
                    type: "object",
                    properties: {},
                    required: [],
                },
            },
        },
        async execute() {
            return runGit(["status", "--short", "--branch"]);
        },
    },
    {
        definition: {
            type: "function",
            function: {
                name: "git_diff",
                description: "Show changes between commits, commit and working tree, etc.",
                parameters: {
                    type: "object",
                    properties: {
                        staged: {
                            type: "boolean",
                            description: "If true, show staged (cached) diff. Defaults to false (unstaged).",
                        },
                        path: {
                            type: "string",
                            description: "Optional: limit diff to a specific file or directory",
                        },
                    },
                    required: [],
                },
            },
        },
        async execute(args) {
            const gitArgs = ["diff"];
            if (args["staged"]) gitArgs.push("--cached");
            if (args["path"]) gitArgs.push("--", String(args["path"]));
            const result = await runGit(gitArgs);
            return result || "(no changes)";
        },
    },
    {
        definition: {
            type: "function",
            function: {
                name: "git_add",
                description: "Stage files for commit.",
                parameters: {
                    type: "object",
                    properties: {
                        paths: {
                            type: "array",
                            items: { type: "string" },
                            description: "List of file paths to stage. Use ['.'] to stage all changes.",
                        },
                    },
                    required: ["paths"],
                },
            },
        },
        async execute(args) {
            const paths = args["paths"] as string[];
            return runGit(["add", "--", ...paths]);
        },
    },
    {
        definition: {
            type: "function",
            function: {
                name: "git_commit",
                description: "Create a commit with the staged changes. Use conventional commit format: type(scope): description",
                parameters: {
                    type: "object",
                    properties: {
                        message: {
                            type: "string",
                            description: "Commit message. Use conventional commits format: feat|fix|chore|docs|refactor|test|style(scope): description",
                        },
                    },
                    required: ["message"],
                },
            },
        },
        async execute(args) {
            const message = String(args["message"]);
            return runGit(["commit", "-m", message]);
        },
    },
    {
        definition: {
            type: "function",
            function: {
                name: "git_log",
                description: "Show recent commit history.",
                parameters: {
                    type: "object",
                    properties: {
                        n: {
                            type: "number",
                            description: "Number of commits to show. Defaults to 10.",
                        },
                    },
                    required: [],
                },
            },
        },
        async execute(args) {
            const n = Number(args["n"] ?? 10);
            return runGit(["log", `--oneline`, `-${n}`]);
        },
    },
];

async function runGit(args: string[]): Promise<string> {
    try {
        const { stdout, stderr } = await execFileAsync("git", args, {
            cwd: process.cwd(),
            maxBuffer: 1024 * 1024,
        });
        return (stdout + stderr).trim() || "(no output)";
    } catch (err: unknown) {
        const e = err as { stdout?: string; stderr?: string; message?: string };
        return `Git error: ${(e.stderr ?? e.message ?? String(err)).trim()}`;
    }
}
