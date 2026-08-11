import { spawn, ChildProcessWithoutNullStreams } from "child_process";
const os = require('os');

console.log(os.platform());
// linux/mac CLI
// usage: syncplay [-h] [--no-gui] [-a hostname] [-n username] [-d] [-g] [--no-store] [-r [room]]
//                 [-p [password]] [--player-path path] [--language language] [--clear-gui-data] [-v]
//                 [--load-playlist-from-file loadPlaylistFromFile]
//                 [file] [options ...]




export class SyncplayManager {
    private process: ChildProcessWithoutNullStreams | null = null;

    private osPlatform: string;
    constructor() {
        this.osPlatform = os.platform();
    }

    start(host: string, serverPass: string, username: string, room: string, playerPath: string, videoPath: string, enableGui: boolean): boolean {
        if (this.process && this.process.exitCode === null) {
            return false;
        }

        if (this.osPlatform === "win32"){
          // should always be disabled for windows because it the CLI and GUI are spereate applications and this would break things
          enableGui= false;
        }

        this.process = spawn(
            this.osPlatform === "win32" ? "C:\\Program Files (x86)\\Syncplay\\SyncplayConsole.exe" : "syncplay",
            [
                "--host", host,
                "--password", serverPass,
                "--name", username,
                "--room", room,
                enableGui ? "" : "--no-gui",
                "--player-path", playerPath, videoPath
            ],
            {
                stdio: ["pipe", "pipe", "pipe"],
            }
        );

        return true;
    }
}
