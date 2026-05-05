import fs from 'fs';
import path from 'path';

export interface JsonStoreOptions {
  envVar: string;
  defaultPath: string;
  migrate?: () => void;
}

export interface JsonStore<T> {
  load(): T;
  save(data: T): void;
  getPath(): string;
}

export function createJsonStore<T>(options: JsonStoreOptions): JsonStore<T> {
  function getPath(): string {
    if (!process.env[options.envVar]) {
      options.migrate?.();
    }
    return process.env[options.envVar] || options.defaultPath;
  }

  function load(): T {
    try {
      const filePath = getPath();
      if (!fs.existsSync(filePath)) {
        return {} as T;
      }
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content) as T;
    } catch {
      return {} as T;
    }
  }

  function save(data: T): void {
    try {
      const filePath = getPath();
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch {
      // Ignore errors when saving
    }
  }

  return { load, save, getPath };
}
