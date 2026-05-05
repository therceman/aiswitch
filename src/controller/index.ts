import net from 'net';
import fs from 'fs';
import path from 'path';
import { IpcRequest, IpcResponse, IpcError, IpcErrorCodes } from '../types/controller';
import {
  parseRequest,
  createSuccessResponse,
  createErrorResponse,
  serializeResponse,
  readLines,
} from './protocol';
import { getIpcEndpointPath } from '../utils/ipc-path';

export type IpcHandler = (request: IpcRequest) => Promise<unknown> | unknown;

export class SessionController {
  private server: net.Server | null = null;
  private socketPath: string;
  private handler: IpcHandler | null = null;

  constructor(sessionKey: string) {
    this.socketPath = getIpcEndpointPath(sessionKey);
  }

  get endpointPath(): string {
    return this.socketPath;
  }

  onRequest(handler: IpcHandler): void {
    this.handler = handler;
  }

  async start(): Promise<void> {
    const dir = path.dirname(this.socketPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (fs.existsSync(this.socketPath)) {
      fs.unlinkSync(this.socketPath);
    }

    return new Promise((resolve, reject) => {
      this.server = net.createServer((socket) => {
        let buffer = '';

        socket.on('data', (chunk: Buffer) => {
          buffer = readLines(buffer + chunk.toString(), (line) => {
            this.handleMessage(line, socket);
          });
        });

        socket.on('error', () => {
          // Socket errors are non-fatal
        });
      });

      this.server.on('error', (err: Error) => {
        reject(err);
      });

      this.server.listen(this.socketPath, () => {
        resolve();
      });
    });
  }

  private async handleMessage(raw: string, socket: net.Socket): Promise<void> {
    let response: IpcResponse;
    try {
      const request = parseRequest(raw);

      if (request.method === 'ping') {
        response = createSuccessResponse(request.id, { pong: true });
      } else if (this.handler) {
        const data = await this.handler(request);
        response = createSuccessResponse(request.id, data);
      } else {
        response = createErrorResponse(
          request.id,
          IpcErrorCodes.INTERNAL_ERROR,
          'No handler registered for this controller'
        );
      }
    } catch (err) {
      if (err instanceof IpcError) {
        response = createErrorResponse(null, err.code, err.message);
      } else {
        response = createErrorResponse(null, IpcErrorCodes.INTERNAL_ERROR, 'Internal server error');
      }
    }

    try {
      socket.write(serializeResponse(response));
    } catch {
      // Ignore write errors
    }
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          this.cleanupSocket();
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  private cleanupSocket(): void {
    try {
      if (fs.existsSync(this.socketPath)) {
        fs.unlinkSync(this.socketPath);
      }
    } catch {
      // Ignore cleanup errors
    }
  }
}
