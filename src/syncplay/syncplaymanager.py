import subprocess
import signal
class SyncplayManager:
    def __init__(self):
        self.process = None

    def start(self, host: str, username: str, room: str):
        if self.process is not None and self.process.poll() is None:
            return False
        self.process = subprocess.Popen(
            [
                r"C:\Program Files (x86)\Syncplay\SyncplayConsole.exe",
                "--host",
                host,
                "--name",
                username,
                "--room",
                room
            ],
            stdin=subprocess.PIPE,
            stdout= subprocess.PIPE,
            creationflags=subprocess.CREATE_NEW_PROCESS_GROUP,
            text=True
        )
        return True

    
    def stop(self):
        if self.process is None:
            return
        
        if self.process.poll() is not None:
            self.process = None
            return False
        self.process.send_signal(signal.CTRL_BREAK_EVENT)
        self.process.wait()

        self.process = None
        return True
        
    def add_video(self, url: str):
        return self.send_command(f"qa {url}")

    def pause_play(self):
        return self.send_command("p")

    def send_command(self, command: str):
        if self.process is None:
            return False
        if self.process.poll() is not None:
            self.process = None
            return False
        self.process.stdin.write(f"{command}\n")
        self.process.stdin.flush()
        return True