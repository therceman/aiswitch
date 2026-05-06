import net from 'net';

const IPC_TIMEOUT = 5000;

export interface OutputQueryResult {
  lines: string[];
  error?: string;
}

/**
 * Connect to a controller socket and request session.output.
 * Shared by session-status and session-find.
 */
export function fetchSessionOutput(endpoint: string): Promise<OutputQueryResult> {
  return new Promise((resolve) => {
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
      resolve({ lines: [], error: 'IPC timeout' });
    }, IPC_TIMEOUT);

    socket.connect(endpoint, () => {
      socket.write(JSON.stringify({ id: 'output-1', method: 'session.output' }) + '\n');
    });

    socket.on('data', (data: Buffer) => {
      buffer += data.toString();
      const idx = buffer.indexOf('\n');
      if (idx !== -1) {
        cleanup();
        try {
          const parsed = JSON.parse(buffer.slice(0, idx));
          if (parsed.type === 'success' && Array.isArray(parsed.data?.lines)) {
            resolve({ lines: parsed.data.lines as string[] });
          } else if (parsed.type === 'error' && parsed.error?.code === 'METHOD_NOT_FOUND') {
            resolve({
              lines: [],
              error:
                'Session controller protocol is older than this CLI. Restart the session with current airelay.',
            });
          } else {
            resolve({ lines: [], error: 'Unexpected response' });
          }
        } catch {
          resolve({ lines: [], error: 'Invalid response' });
        }
      }
    });

    socket.on('error', (err) => {
      cleanup();
      resolve({ lines: [], error: err.message });
    });
  });
}
