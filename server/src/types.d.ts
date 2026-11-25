declare module "@prisma/adapter-pg" {
  export class PrismaPg {
    constructor(options?: { connectionString?: string });
  }
}

declare module "better-auth" {
  export function betterAuth(config: any): any;
}

declare module "better-auth/node" {
  export function toNodeHandler(auth: any): any;
}

declare module "better-auth/adapters/prisma" {
  export function prismaAdapter(prisma: any, options?: any): any;
}

declare module "better-auth/crypto" {
  export function hashPassword(password: string): Promise<string>;
}

declare module "pg-boss" {
  export class PgBoss {
    constructor(options?: any);
    on(event: string, handler: any): void;
    start(): Promise<void>;
    stop(options?: any): Promise<void>;
    createQueue(name: string, options?: any): Promise<void>;
    work(queue: string, handler: any): Promise<void>;
    send(queue: string, data: any, options?: any): Promise<void>;
  }
}

declare module "@sentry/node" {
  const Sentry: any;
  export default Sentry;
}

declare module "@ai-sdk/openai" {
  export function openai(model: string): any;
}

declare module "ai" {
  export function generateText(options: any): Promise<any>;
}

declare module "@sendgrid/mail" {
  const sgMail: any;
  export default sgMail;
}

declare module "@sendgrid/inbound-mail-parser" {
  export function parse(stream: any): Promise<any>;
}
