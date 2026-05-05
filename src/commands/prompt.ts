import net from 'net';
import { findSessionByKey } from './sessions';
import { getIpcEndpointPath } from '../utils/ipc-path';
import { readLines } from '../controller/protocol';

const IPC_TIMEOUT = 5000;

interface IpcClientRequest {
  id: string;
  method: string;
  params?: Record<string, unknown>;
}

interface IpcClientResponse {
  type: string;
  error?: { code: string; message: string };
}

function sendIpcRequest(
  endpointPath: string,
  request: IpcClientRequest
): Promise<IpcClientResponse> {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let buffer = '';
    let cleanedUp = false;

    const cleanup = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      clearTimeout(timeout);
      socket.destroy();
    };

    const timeout = setTimeout(() => {
      cleanup();
      const err = new Error('IPC request timed out');
      reject(err);
    }, IPC_TIMEOUT);

    socket.connect(endpointPath, () => {
      socket.write(JSON.stringify(request) + '\n');
    });

    socket.on('data', (data: Buffer) => {
      buffer = readLines(buffer + data.toString(), (line) => {
        cleanup();
        try {
          resolve(JSON.parse(line) as IpcClientResponse);
        } catch {
          reject(new Error('Invalid IPC response: failed to parse JSON'));
        }
      });
    });

    socket.on('error', (err: Error) => {
      cleanup();
      reject(err);
    });

    socket.on('close', () => {
      cleanup();
      if (!cleanedUp) {
        reject(new Error('Connection closed without response'));
      }
    });
  });
}

export async function promptCommand(
  sessionKeyOrId: string,
  text?: string,
  options?: { enter?: boolean }
): Promise<number> {
  const resolvedText = text || undefined;

  if (!resolvedText) {
    console.error('Error: Text is required.');
    console.error('Usage: airelay prompt <session> <text>');
    return 1;
  }

  const found = findSessionByKey(sessionKeyOrId);
  if (!found) {
    console.error(`Error: Session not found: ${sessionKeyOrId}`);
    console.error('Use "airelay list --sessions" to see available sessions.');
    return 1;
  }

  const sessionKey = found.session.sessionKey || found.session.id;
  const endpointPath = found.session.controllerEndpoint || getIpcEndpointPath(sessionKey);
  const enter = options?.enter !== false;

  try {
    const response = await sendIpcRequest(endpointPath, {
      id: 'prompt-1',
      method: 'session.input',
      params: { text: resolvedText, enter },
    });

    if (response.type === 'error' && response.error) {
      console.error(`Error: IPC error from controller: ${response.error.message}`);
      return 1;
    }

    console.log('✓ Prompt sent successfully.');
    return 0;
  } catch (err: unknown) {
    const nodeErr = err as Error & { code?: string };

    if (
      nodeErr.code === 'ENOENT' ||
      nodeErr.code === 'ECONNREFUSED' ||
      nodeErr.code === 'ENOTCONN'
    ) {
      console.error(`Error: Controller offline for session: ${sessionKeyOrId}`);
      console.error('Make sure the session is active and running.');
      return 1;
    }

    if (nodeErr.message?.includes('timed out')) {
      console.error('Error: IPC timeout - controller did not respond.');
      return 1;
    }

    if (nodeErr.message?.includes('Invalid IPC response')) {
      console.error(`Error: ${nodeErr.message}`);
      return 1;
    }

    console.error(`Error: IPC communication failed - ${nodeErr.message || 'Unknown error'}`);
    return 1;
  }
}
