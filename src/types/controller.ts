export type IpcMethod = 'ping' | 'session.info' | 'session.input';

export interface IpcRequest {
  id: string;
  method: IpcMethod;
  params?: Record<string, unknown>;
}

export interface SessionInfoParams {
  sessionKey?: string;
}

export interface SessionInputParams {
  text: string;
  /**
   * Submit byte to append after text.
   * - "\r" (0x0D) = Enter (default for opencode/unknown)
   * - "\n" (0x0A) = Ctrl+J (default for codex)
   * - false or absent = no submit byte
   */
  enter?: string | boolean;
}

export interface IpcSuccessResponse<T = unknown> {
  id: string;
  type: 'success';
  data: T;
}

export interface IpcErrorResponse {
  id: string;
  type: 'error';
  error: {
    code: string;
    message: string;
  };
}

export type IpcResponse = IpcSuccessResponse | IpcErrorResponse;

export const IpcErrorCodes = {
  PARSE_ERROR: 'PARSE_ERROR',
  INVALID_REQUEST: 'INVALID_REQUEST',
  METHOD_NOT_FOUND: 'METHOD_NOT_FOUND',
  INVALID_PARAMS: 'INVALID_PARAMS',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type IpcErrorCode = (typeof IpcErrorCodes)[keyof typeof IpcErrorCodes];

export class IpcError extends Error {
  constructor(
    public code: IpcErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'IpcError';
  }
}

export interface PingData {
  pong: true;
}

export interface SessionInfoData {
  sessionKey: string;
  active: boolean;
}
