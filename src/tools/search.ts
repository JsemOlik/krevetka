import { execFile } from "child_process";
import { promisify } from "util";
import type { ToolHandler } from "./fs.js";

const execFileAsync = promisify(execFile);

export const searchTools: ToolHandler[] = [
    {
        definition: {
            type: "function",
            function: {
                name: "grep_search",
                description: "Search for a pattern in files using ripgrep (or grep as fallback). Returns matching lines with file names and line numbers.",
                parameters: {
                    type: "object",
                    properties: {
                        pattern: {
                            type: "string",
                            description: "The search pattern (regex supported)",
                        },
                        path: {
                            type: "string",
                            description: "Directory or file to search in. Defaults to current directory.",
                        },
                        case_insensitive: {
                            type: "boolean",
                            description: "If true, search is case-insensitive. Defaults to false.",
                        },
                        include: {
                            type: "string",
                            description: "Glob pattern to filter files, e.g. '*.ts' or '*.{ts,tsx}'",
                        },
                    },
                    required: ["pattern"],
                },
            },
        },
        async execute(args) {
            const pattern = String(args["pattern"]);
            const searchPath = String(args["path"] ?? ".");
            const caseInsensitive = Boolean(args["case_insensitive"] ?? false);
            const include = args["include"] ? String(args["include"]) : undefined;

            // Try ripgrep first, fall back to grep
            try {
                const rgArgs = [
                    "--line-number",
                    "--with-filename",
                    "--max-count=50",
                    "--max-filesize=1M",
                ];
                if (caseInsensitive) rgArgs.push("--ignore-case");
                if (include) rgArgs.push("--glob", include);
                rgArgs.push(pattern, searchPath);

                const { stdout } = await execFileAsync("rg", rgArgs, {
                    cwd: process.cwd(),
                    maxBuffer: 512 * 1024,
                });
                return stdout.trim() || "(no matches)";
            } catch (rgErr: unknown) {
                // If rg not found, try grep
                const e = rgErr as { code?: string | number };
                if (e.code === "ENOENT" || e.code === 127) {
                    try {
                        const grepArgs = ["-rn", "--include=*"];
                        if (caseInsensitive) grepArgs.push("-i");
                        if (include) grepArgs.push(`--include=${include}`);
                        grepArgs.push(pattern, searchPath);

                        const { stdout } = await execFileAsync("grep", grepArgs, {
                            cwd: process.cwd(),
                            maxBuffer: 512 * 1024,
                        });
                        return stdout.trim() || "(no matches)";
                    } catch {
                        return "(no matches)";
                    }
                }
                // rg found but returned non-zero (e.g. no matches)
                return "(no matches)";
            }
        },
    },
    {
        definition: {
            type: "function",
            function: {
                name: "find_files",
                description: "Find files by name pattern in a directory.",
                parameters: {
                    type: "object",
                    properties: {
                        pattern: {
                            type: "string",
                            description: "Filename pattern to search for, e.g. '*.ts' or 'package.json'",
                        },
                        path: {
                            type: "string",
                            description: "Directory to search in. Defaults to current directory.",
                        },
                    },
                    required: ["pattern"],
                },
            },
        },
        async execute(args) {
            const pattern = String(args["pattern"]);
            const searchPath = String(args["path"] ?? ".");
            try {
                const { stdout } = await execFileAsync("find", [
                    searchPath,
                    "-name",
                    pattern,
                    "-not",
                    "-path",
                    "*/node_modules/*",
                    "-not",
                    "-path",
                    "*/.git/*",
                    "-maxdepth",
                    "10",
                ], {
                    cwd: process.cwd(),
                    maxBuffer: 512 * 1024,
                });
                return stdout.trim() || "(no files found)";
            } catch {
                return "(no files found)";
            }
        },
    },
];
