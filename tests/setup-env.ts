import { vi } from "vitest";

process.env.DATABASE_URL ??= "postgresql://user:password@localhost:5432/test";
process.env.REDIS_URL ??= "redis://localhost:6379";
process.env.NEXTAUTH_URL ??= "http://localhost:3000";
process.env.NEXTAUTH_SECRET ??= "test-secret";
process.env.ALLOWED_EMAIL_DOMAIN ??= "example.com";
process.env.DAILY_QUOTA ??= "40";

class MockQueue {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(public name: string, _opts?: any) {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  add(_name: string, _data: any) {
    return Promise.resolve();
  }
  close() {
    return Promise.resolve();
  }
}

class MockWorker {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(public name: string, _processor: any, _opts?: any) {}
  on() {
    return this;
  }
  close() {
    return Promise.resolve();
  }
}

class MockQueueEvents {
  constructor(public name: string) {}
  on() {
    return this;
  }
  close() {
    return Promise.resolve();
  }
}

vi.mock("bullmq", () => ({
  Queue: MockQueue,
  Worker: MockWorker,
  QueueEvents: MockQueueEvents,
  JobsOptions: class {}
}));

class MockRedis {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(_url?: string, _opts?: any) {}
  duplicate() {
    return this;
  }
  on() {
    return this;
  }
  quit() {
    return Promise.resolve();
  }
  // For bullmq compatibility
  disconnect() {
    return Promise.resolve();
  }
  // eslint-disable-next-line class-methods-use-this
  status = "ready";
}

vi.mock("ioredis", () => ({
  __esModule: true,
  default: MockRedis
}));
