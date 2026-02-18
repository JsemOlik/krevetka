import { spawn } from "child_process";
import readline from "readline";
import chalk from "chalk";
import type { ToolHandler } from "./fs.js";

export function createShellTool(skipApproval: boolean): ToolHandler {
    return {
        definition: {
            type: "function",
            function: {
                name: "run_shell_command",
                description: "Run a shell command in the current working directory. The user will be asked to approve the command before it runs (unless auto-approval is enabled).",
                parameters: {
                    type: "object",
                    properties: {
                        command: {
                            type: "string",
                            description: "The shell command to run",
                        },
                        working_directory: {
                            type: "string",
                            description: "Optional: working directory to run the command in. Defaults to current directory.",
                        },
                    },
                    required: ["command"],
                },
            },
        },
        async execute(args) {
            const command = String(args["command"]);
            const cwd = args["working_directory"] ? String(args["working_directory"]) : process.cwd();

            if (!skipApproval) {
                const approved = await promptApproval(command);
                if (!approved) {
                    return "Command was rejected by the user.";
                }
            }

            return runCommand(command, cwd);
        },
    };
}

async function promptApproval(command: string): Promise<boolean> {
    process.stdout.write(
        `\n${chalk.yellow("⚡ Shell command:")} ${chalk.white(command)}\n` +
        `${chalk.dim("Run this command? [y/N] ")}`
    );

    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            terminal: false,
        });

        // Handle non-TTY (pipe) case
        if (!process.stdin.isTTY) {
            rl.close();
            resolve(false);
            return;
        }

        process.stdin.setRawMode(true);
        process.stdin.resume();

        const onData = (key: Buffer) => {
            const char = key.toString();
            process.stdin.setRawMode(false);
            process.stdin.pause();
            process.stdin.removeListener("data", onData);
            rl.close();

            if (char === "y" || char === "Y") {
                process.stdout.write("y\n");
                resolve(true);
            } else {
                process.stdout.write("N\n");
                resolve(false);
            }
        };

        process.stdin.on("data", onData);
    });
}

function runCommand(command: string, cwd: string): Promise<string> {
    return new Promise((resolve) => {
        const output: string[] = [];
        const proc = spawn("sh", ["-c", command], {
            cwd,
            stdio: ["inherit", "pipe", "pipe"],
        });

        proc.stdout?.on("data", (data: Buffer) => {
            const text = data.toString();
            process.stdout.write(chalk.dim(text));
            output.push(text);
        });

        proc.stderr?.on("data", (data: Buffer) => {
            const text = data.toString();
            process.stderr.write(chalk.dim(text));
            output.push(text);
        });

        proc.on("close", (code) => {
            const result = output.join("").trim();
            resolve(
                result
                    ? `Exit code: ${code}\n${result}`
                    : `Exit code: ${code}`
            );
        });

        proc.on("error", (err) => {
            resolve(`Error running command: ${err.message}`);
        });
    });
}
