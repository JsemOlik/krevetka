import fs from "fs";
import path from "path";
import type { ToolDefinition } from "../llm/types.js";

export interface ToolHandler {
    definition: ToolDefinition;
    execute: (args: Record<string, unknown>) => Promise<string>;
}

const MAX_FILE_SIZE = 1024 * 1024; // 1MB read limit

export const fsTools: ToolHandler[] = [
    {
        definition: {
            type: "function",
            function: {
                name: "read_file",
                description: "Read the contents of a file. Returns the file content as a string. For large files, only the first 1MB is returned.",
                parameters: {
                    type: "object",
                    properties: {
                        path: {
                            type: "string",
                            description: "Absolute or relative path to the file to read",
                        },
                        start_line: {
                            type: "number",
                            description: "Optional: 1-indexed line to start reading from",
                        },
                        end_line: {
                            type: "number",
                            description: "Optional: 1-indexed line to stop reading at (inclusive)",
                        },
                    },
                    required: ["path"],
                },
            },
        },
        async execute(args) {
            const filePath = String(args["path"]);
            const startLine = args["start_line"] ? Number(args["start_line"]) : undefined;
            const endLine = args["end_line"] ? Number(args["end_line"]) : undefined;

            try {
                const stat = fs.statSync(filePath);
                if (stat.size > MAX_FILE_SIZE) {
                    return `Error: File is too large (${stat.size} bytes). Max is ${MAX_FILE_SIZE} bytes.`;
                }
                let content = fs.readFileSync(filePath, "utf-8");
                if (startLine !== undefined || endLine !== undefined) {
                    const lines = content.split("\n");
                    const start = (startLine ?? 1) - 1;
                    const end = endLine ?? lines.length;
                    content = lines.slice(start, end).join("\n");
                }
                return content;
            } catch (err) {
                return `Error reading file: ${err instanceof Error ? err.message : String(err)}`;
            }
        },
    },
    {
        definition: {
            type: "function",
            function: {
                name: "write_file",
                description: "Write content to a file, creating it and any parent directories if they don't exist. Overwrites existing files.",
                parameters: {
                    type: "object",
                    properties: {
                        path: {
                            type: "string",
                            description: "Absolute or relative path to the file to write",
                        },
                        content: {
                            type: "string",
                            description: "The content to write to the file",
                        },
                    },
                    required: ["path", "content"],
                },
            },
        },
        async execute(args) {
            const filePath = String(args["path"]);
            const content = String(args["content"]);
            try {
                fs.mkdirSync(path.dirname(filePath), { recursive: true });
                fs.writeFileSync(filePath, content, "utf-8");
                return `Successfully wrote ${content.length} characters to ${filePath}`;
            } catch (err) {
                return `Error writing file: ${err instanceof Error ? err.message : String(err)}`;
            }
        },
    },
    {
        definition: {
            type: "function",
            function: {
                name: "edit_file",
                description: "Replace a specific string in a file with new content. Use this for targeted edits instead of rewriting the whole file.",
                parameters: {
                    type: "object",
                    properties: {
                        path: {
                            type: "string",
                            description: "Path to the file to edit",
                        },
                        old_string: {
                            type: "string",
                            description: "The exact string to find and replace (must be unique in the file)",
                        },
                        new_string: {
                            type: "string",
                            description: "The replacement string",
                        },
                    },
                    required: ["path", "old_string", "new_string"],
                },
            },
        },
        async execute(args) {
            const filePath = String(args["path"]);
            const oldStr = String(args["old_string"]);
            const newStr = String(args["new_string"]);
            try {
                const content = fs.readFileSync(filePath, "utf-8");
                const count = content.split(oldStr).length - 1;
                if (count === 0) {
                    return `Error: The string was not found in ${filePath}`;
                }
                if (count > 1) {
                    return `Error: The string appears ${count} times in ${filePath}. Make it more specific.`;
                }
                const newContent = content.replace(oldStr, newStr);
                fs.writeFileSync(filePath, newContent, "utf-8");
                return `Successfully edited ${filePath}`;
            } catch (err) {
                return `Error editing file: ${err instanceof Error ? err.message : String(err)}`;
            }
        },
    },
    {
        definition: {
            type: "function",
            function: {
                name: "list_directory",
                description: "List the contents of a directory, showing files and subdirectories.",
                parameters: {
                    type: "object",
                    properties: {
                        path: {
                            type: "string",
                            description: "Path to the directory to list. Defaults to current directory.",
                        },
                        recursive: {
                            type: "boolean",
                            description: "If true, list recursively. Defaults to false.",
                        },
                    },
                    required: [],
                },
            },
        },
        async execute(args) {
            const dirPath = String(args["path"] ?? ".");
            const recursive = Boolean(args["recursive"] ?? false);
            try {
                return listDir(dirPath, recursive, 0);
            } catch (err) {
                return `Error listing directory: ${err instanceof Error ? err.message : String(err)}`;
            }
        },
    },
    {
        definition: {
            type: "function",
            function: {
                name: "delete_file",
                description: "Delete a file or empty directory.",
                parameters: {
                    type: "object",
                    properties: {
                        path: {
                            type: "string",
                            description: "Path to the file or directory to delete",
                        },
                    },
                    required: ["path"],
                },
            },
        },
        async execute(args) {
            const filePath = String(args["path"]);
            try {
                const stat = fs.statSync(filePath);
                if (stat.isDirectory()) {
                    fs.rmdirSync(filePath);
                } else {
                    fs.unlinkSync(filePath);
                }
                return `Successfully deleted ${filePath}`;
            } catch (err) {
                return `Error deleting: ${err instanceof Error ? err.message : String(err)}`;
            }
        },
    },
];

function listDir(dirPath: string, recursive: boolean, depth: number): string {
    const MAX_DEPTH = 5;
    const MAX_ENTRIES = 200;
    const entries: string[] = [];
    let count = 0;

    function walk(dir: string, indent: string) {
        if (depth > 0 && indent.length / 2 >= MAX_DEPTH) return;
        const items = fs.readdirSync(dir, { withFileTypes: true });
        for (const item of items) {
            if (count >= MAX_ENTRIES) {
                entries.push(`${indent}... (truncated)`);
                return;
            }
            const isDir = item.isDirectory();
            const name = isDir ? `${item.name}/` : item.name;
            entries.push(`${indent}${name}`);
            count++;
            if (isDir && recursive && !item.name.startsWith(".") && item.name !== "node_modules") {
                walk(path.join(dir, item.name), indent + "  ");
            }
        }
    }

    walk(dirPath, "");
    return entries.length > 0 ? entries.join("\n") : "(empty directory)";
}
