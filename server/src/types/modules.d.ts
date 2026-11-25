// ─── Node.js Global Types ────────────────────────────────────────────────────

declare var process: {
  env: Record<string, string | undefined>;
  exit(code?: number): never;
  on(event: string, listener: (...args: any[]) => void): any;
  argv: string[];
  cwd(): string;
  platform: string;
  version: string;
  [key: string]: any;
};

declare var console: {
  log(...args: any[]): void;
  error(...args: any[]): void;
  warn(...args: any[]): void;
  info(...args: any[]): void;
  debug(...args: any[]): void;
  [key: string]: any;
};

declare var __dirname: string;
declare var __filename: string;

interface ImportMeta {
  url: string;
  dirname: string;
  filename: string;
  resolve(specifier: string): string;
}

// ─── Node Built-ins ───────────────────────────────────────────────────────────

declare module "path" {
  export function join(...paths: string[]): string;
  export function resolve(...paths: string[]): string;
  export function dirname(p: string): string;
  export function basename(p: string, ext?: string): string;
  export function extname(p: string): string;
  export function normalize(p: string): string;
  export function relative(from: string, to: string): string;
  export function isAbsolute(p: string): boolean;
  export const sep: string;
  export const delimiter: string;
  const path: {
    join(...paths: string[]): string;
    resolve(...paths: string[]): string;
    dirname(p: string): string;
    basename(p: string, ext?: string): string;
    extname(p: string): string;
    normalize(p: string): string;
    relative(from: string, to: string): string;
    isAbsolute(p: string): boolean;
    sep: string;
    delimiter: string;
  };
  export default path;
}

declare module "http" {
  export interface Server {
    close(callback?: (err?: Error) => void): this;
    listen(port: number, callback?: () => void): this;
    [key: string]: any;
  }
  export interface IncomingMessage {
    headers: Record<string, string | string[] | undefined>;
    method?: string;
    url?: string;
    [key: string]: any;
  }
  export interface ServerResponse {
    statusCode: number;
    setHeader(name: string, value: any): this;
    end(chunk?: any): void;
    [key: string]: any;
  }
}

declare module "stream" {
  export class Readable {
    [key: string]: any;
  }
  export class Writable {
    [key: string]: any;
  }
  export class Transform {
    [key: string]: any;
  }
}

// ─── dotenv ───────────────────────────────────────────────────────────────────

declare module "dotenv" {
  export function config(options?: any): any;
}

declare module "dotenv/config" {
  const _default: any;
  export default _default;
}

declare module "express" {
  import type * as http from "http";

  export interface Request {
    [key: string]: any;
  }
  export interface Response {
    status(code: number): this;
    json(body?: any): this;
    send(body?: any): this;
    sendFile(path: string): void;
    setHeader(name: string, value: any): this;
    writeHead(statusCode: number, headers?: any): this;
    end(chunk?: any): void;
    [key: string]: any;
  }
  export type NextFunction = (err?: any) => void;
  export type RequestHandler = (req: Request, res: Response, next: NextFunction) => any;
  export type ErrorRequestHandler = (err: any, req: Request, res: Response, next: NextFunction) => any;

  export interface Router {
    get(path: string, ...handlers: RequestHandler[]): this;
    post(path: string, ...handlers: RequestHandler[]): this;
    put(path: string, ...handlers: RequestHandler[]): this;
    patch(path: string, ...handlers: RequestHandler[]): this;
    delete(path: string, ...handlers: RequestHandler[]): this;
    use(...handlers: (string | RequestHandler | Router)[]): this;
    all(path: string, ...handlers: RequestHandler[]): this;
    [key: string]: any;
  }

  export interface Application extends Router {
    listen(port: number | string, callback?: () => void): http.Server;
    json: typeof json;
    static: typeof expressStatic;
    urlencoded: typeof urlencoded;
    [key: string]: any;
  }

  export function Router(options?: any): Router;
  export function json(options?: any): RequestHandler;
  export function urlencoded(options?: any): RequestHandler;
  function expressStatic(root: string, options?: any): RequestHandler;

  interface ExpressFunction {
    (): Application;
    json(options?: any): RequestHandler;
    urlencoded(options?: any): RequestHandler;
    static(root: string, options?: any): RequestHandler;
    Router(): Router;
  }

  const express: ExpressFunction;
  export default express;
}

declare module "cors" {
  import type { RequestHandler } from "express";
  export default function cors(options?: any): RequestHandler;
}

declare module "helmet" {
  import type { RequestHandler } from "express";
  export default function helmet(options?: any): RequestHandler;
}

declare module "express-rate-limit" {
  import type { RequestHandler } from "express";
  export default function rateLimit(options?: any): RequestHandler;
}

declare module "better-auth" {
  export interface BetterAuthInstance {
    api: {
      getSession(options: { headers: any }): Promise<{ user: any; session: any } | null>;
      [key: string]: any;
    };
    $Infer?: {
      Session: {
        user: any;
        session: any;
      };
    };
    [key: string]: any;
  }

  export function betterAuth(config: any): BetterAuthInstance;
}

declare module "better-auth/node" {
  export function toNodeHandler(auth: any): (req: any, res: any) => Promise<any>;
  export function fromNodeHeaders(headers: any): any;
}

declare module "better-auth/adapters/prisma" {
  export function prismaAdapter(prisma: any, options?: any): any;
}

declare module "better-auth/crypto" {
  export function hashPassword(password: string): Promise<string>;
}

declare module "@prisma/adapter-pg" {
  export class PrismaPg {
    constructor(options?: { connectionString?: string });
  }
}

declare module "@prisma/client" {
  export class PrismaClient {
    constructor(options?: any);
    [key: string]: any;
  }
}

declare module "pg-boss" {
  export interface PgBoss {
    on(event: string, handler: any): void;
    start(): Promise<void>;
    stop(options?: any): Promise<void>;
    createQueue(name: string, options?: any): Promise<void>;
    work: <T = any>(name: string, handler: any, options?: any) => Promise<void>;
    send: <T = any>(name: string, data?: any, options?: any) => Promise<any>;
  }
  export const PgBoss: {
    new (options?: any): PgBoss;
  };
  export default PgBoss;
}

declare module "prisma/config" {
  export function defineConfig<T extends object>(config: T): T;
}

declare module "@sentry/node" {
  export function init(options?: any): void;
  export function captureException(err: any, captureContext?: any): void;
  export function captureMessage(message: string, level?: any): void;
  export function setupExpressErrorHandler(app: any): void;
  export function withScope(callback: (scope: any) => void): void;
  export function setUser(user: any): void;
  export function setTag(key: string, value: string): void;
  export const SDK_VERSION: string;
  const SentryDefault: {
    init(options?: any): void;
    captureException(err: any, captureContext?: any): void;
    captureMessage(message: string, level?: any): void;
    setupExpressErrorHandler(app: any): void;
    withScope(callback: (scope: any) => void): void;
    setUser(user: any): void;
    [key: string]: any;
  };
  export default SentryDefault;
}

declare module "multer" {
  import type { RequestHandler } from "express";
  function multer(options?: any): {
    single(fieldName: string): RequestHandler;
    array(fieldName: string, maxCount?: number): RequestHandler;
    fields(fields: any[]): RequestHandler;
    none(): RequestHandler;
    any(): RequestHandler;
  };
  export default multer;
}

declare module "@sendgrid/mail" {
  const sgMail: {
    setApiKey(key: string): void;
    send(data: any): Promise<any>;
    [key: string]: any;
  };
  export default sgMail;
}

declare module "@sendgrid/inbound-mail-parser" {
  export default class InboundMailParser {
    constructor(config?: any, data?: any);
    keyValues(): Record<string, any>;
    parse(stream: any): Promise<any>;
  }
  export function parse(stream: any): Promise<any>;
}

declare module "ai" {
  export function generateText(options: any): Promise<any>;
}

declare module "@ai-sdk/openai" {
  export function openai(model: string): any;
}

declare module "zod" {
  export namespace z {
    export type infer<T> = any;
    export type ZodType<T = any> = any;
  }
  export const z: any;
  export type infer<T> = any;
  export type ZodType<Output = any, Def = any, Input = Output> = any;
  const _z: any;
  export default _z;
}

declare module "zod/v4" {
  export namespace z {
    export type infer<T> = any;
    export type ZodType<T = any> = any;
  }
  export const z: any;
  export type infer<T> = any;
  export type ZodType<Output = any, Def = any, Input = Output> = any;
  const _z: any;
  export default _z;
}

declare var crypto: any;
declare var fs: any;

declare module "fs" {
  export function readFileSync(path: string, options?: any): any;
  export function writeFileSync(path: string, data: any, options?: any): void;
  export function existsSync(path: string): boolean;
  const _fs: any;
  export default _fs;
}

declare module "crypto" {
  export function randomUUID(): string;
  const _crypto: any;
  export default _crypto;
}

declare namespace Express {
  namespace Multer {
    interface File {
      fieldname: string;
      originalname: string;
      encoding: string;
      mimetype: string;
      size: number;
      destination: string;
      filename: string;
      path: string;
      buffer: any;
      [key: string]: any;
    }
  }
}
