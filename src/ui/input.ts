import readline from "readline";
import chalk from "chalk";

export class InputHandler {
    private rl: readline.Interface;
    private history: string[] = [];
    private historyIndex = -1;

    constructor() {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            terminal: true,
            historySize: 100,
        });
    }

    async prompt(): Promise<string | null> {
        return new Promise((resolve) => {
            process.stdout.write(chalk.bold.green("\n▶ "));

            let buffer = "";
            let continuation = false;

            const handleLine = (line: string) => {
                // Multi-line continuation with backslash
                if (line.endsWith("\\")) {
                    buffer += line.slice(0, -1) + "\n";
                    continuation = true;
                    process.stdout.write(chalk.dim("  "));
                    return;
                }

                buffer += line;
                const input = buffer.trim();
                buffer = "";
                continuation = false;

                if (input) {
                    this.history.unshift(input);
                    if (this.history.length > 100) this.history.pop();
                }

                this.rl.removeListener("line", handleLine);
                this.rl.removeListener("close", handleClose);
                resolve(input || null);
            };

            const handleClose = () => {
                this.rl.removeListener("line", handleLine);
                resolve(null);
            };

            this.rl.on("line", handleLine);
            this.rl.once("close", handleClose);
        });
    }

    close(): void {
        this.rl.close();
    }
}
