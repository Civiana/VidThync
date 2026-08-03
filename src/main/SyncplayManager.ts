import { spawn, ChildProcessWithoutNullStreams } from "child_process";

export class SyncplayManager {
    private process: ChildProcessWithoutNullStreams | null = null;

    start(host: string, username: string, room: string): boolean {
        if (this.process && this.process.exitCode === null) {
            return false;
        }

        this.process = spawn(
            "C:\\Program Files (x86)\\Syncplay\\SyncplayConsole.exe",
            [
                "--host", host,
                "--name", username,
                "--room", room,
            ],
            {
                stdio: ["pipe", "pipe", "pipe"],
            }
        );

        return true;
    }

    stop(): boolean {
        if (!this.process) return false;

        this.process.kill("SIGINT");
        this.process = null;

        return true;
    }

    private sendCommand(command: string): boolean {
        if (!this.process) return false;

        if (this.process.exitCode !== null) {
            this.process = null;
            return false;
        }

        this.process.stdin.write(`${command}\n`);
        return true;
    }

    addVideo(path: string): boolean {
        return this.sendCommand(`qa ${path}`);
    }

    playPause(): boolean {
        return this.sendCommand("p");
    }
}