import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import path from 'path';
import fs from 'fs';
import readline from 'readline';

export class EngineProcessAdapter {
  private static instance: EngineProcessAdapter;
  private childProcess: ChildProcessWithoutNullStreams | null = null;
  private binaryPath: string;
  private pendingRequests: Array<{
    resolve: (val: any) => void;
    reject: (err: any) => void;
    timer: NodeJS.Timeout;
  }> = [];

  private constructor() {
    this.binaryPath = path.resolve(process.cwd(), '../engine/bin/indexer_engine.exe');
    this.ensureProcess();
  }

  public static getInstance(): EngineProcessAdapter {
    if (!EngineProcessAdapter.instance) {
      EngineProcessAdapter.instance = new EngineProcessAdapter();
    }
    return EngineProcessAdapter.instance;
  }

  private ensureProcess(): void {
    if (this.childProcess && !this.childProcess.killed) {
      return;
    }

    if (!fs.existsSync(this.binaryPath)) {
      console.warn(`[EngineAdapter] Binary not found at ${this.binaryPath}. Please run scripts/build_engine script.`);
      return;
    }

    try {
      this.childProcess = spawn(this.binaryPath, [], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      const rl = readline.createInterface({
        input: this.childProcess.stdout,
        terminal: false
      });

      rl.on('line', (line: string) => {
        const trimmed = line.trim();
        if (!trimmed) return;

        const pending = this.pendingRequests.shift();
        if (pending) {
          clearTimeout(pending.timer);
          try {
            const parsed = JSON.parse(trimmed);
            pending.resolve(parsed);
          } catch (err) {
            pending.reject(new Error(`Failed to parse engine output: ${trimmed}`));
          }
        }
      });

      this.childProcess.stderr.on('data', (data: Buffer) => {
        console.log(`[C++ Engine Diagnostics] ${data.toString().trim()}`);
      });

      this.childProcess.on('error', (err: Error) => {
        console.error('[EngineAdapter] Process error:', err);
        this.flushPending(err);
      });

      this.childProcess.on('exit', (code: number | null) => {
        console.log(`[EngineAdapter] Process exited with code ${code}`);
        this.flushPending(new Error(`Engine process exited unexpectedly with code ${code}`));
        this.childProcess = null;
      });

      console.log('[EngineAdapter] Engine process spawned successfully.');
    } catch (err) {
      console.error('[EngineAdapter] Failed to spawn process:', err);
    }
  }

  private flushPending(err: Error): void {
    while (this.pendingRequests.length > 0) {
      const p = this.pendingRequests.shift();
      if (p) {
        clearTimeout(p.timer);
        p.reject(err);
      }
    }
  }

  public sendCommand<T = any>(commandObj: any, timeoutMs = 7000): Promise<T> {
    return new Promise((resolve, reject) => {
      this.ensureProcess();

      if (!this.childProcess || !this.childProcess.stdin.writable) {
        return reject(new Error('Engine process is not running or stdin is closed.'));
      }

      const timer = setTimeout(() => {
        const idx = this.pendingRequests.findIndex(p => p.timer === timer);
        if (idx !== -1) {
          this.pendingRequests.splice(idx, 1);
        }
        reject(new Error(`Engine command timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      this.pendingRequests.push({ resolve, reject, timer });

      try {
        const payload = JSON.stringify(commandObj) + '\n';
        this.childProcess.stdin.write(payload);
      } catch (err) {
        clearTimeout(timer);
        const idx = this.pendingRequests.findIndex(p => p.timer === timer);
        if (idx !== -1) {
          this.pendingRequests.splice(idx, 1);
        }
        reject(err);
      }
    });
  }

  public ping(): Promise<any> {
    return this.sendCommand({ command: 'ping' });
  }
}
