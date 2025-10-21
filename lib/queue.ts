import {
  Queue,
  Worker,
  QueueEvents,
  type JobsOptions,
  type Processor
} from "bullmq";
import IORedis from "ioredis";

import { getServerEnv } from "@/lib/env";

const env = getServerEnv();

// During build phase, create a mock connection that doesn't actually connect
class MockRedis {
  async ping() {
    return "PONG";
  }
  async disconnect() {
    return undefined;
  }
  on() {
    return this;
  }
  once() {
    return this;
  }
  off() {
    return this;
  }
  emit() {
    return false;
  }
}

export const connection =
  process.env.SKIP_ENV_VALIDATION === "true"
    ? (new MockRedis() as any)
    : new IORedis(env.REDIS_URL, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false
      });

export const QUEUE_NAMES = {
  ingest: "ingestQueue",
  enrich: "enrichQueue",
  update: "updateQueue",
  notify: "notifyQueue"
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

function createQueue<T = any, R = any, N extends string = string>(
  name: QueueName
) {
  return new Queue<T, R, N>(name, {
    connection,
    defaultJobOptions: {
      removeOnComplete: true,
      removeOnFail: false,
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000
      }
    } satisfies JobsOptions
  });
}

// During build, export mock queues to avoid connection attempts
const createMockQueue = () => ({
  add: async () => ({ id: "mock" }),
  getJob: async () => null,
  getJobs: async () => [],
  close: async () => undefined
} as any);

export const ingestQueue = process.env.SKIP_ENV_VALIDATION === "true"
  ? createMockQueue()
  : createQueue(QUEUE_NAMES.ingest);
export const enrichQueue = process.env.SKIP_ENV_VALIDATION === "true"
  ? createMockQueue()
  : createQueue(QUEUE_NAMES.enrich);
export const updateQueue = process.env.SKIP_ENV_VALIDATION === "true"
  ? createMockQueue()
  : createQueue(QUEUE_NAMES.update);
export const notifyQueue = process.env.SKIP_ENV_VALIDATION === "true"
  ? createMockQueue()
  : createQueue(QUEUE_NAMES.notify);

export function createWorker<T = any, R = any, N extends string = string>(
  name: QueueName,
  processor: Processor<T, R, N>,
  concurrency = 1
) {
  return new Worker<T, R, N>(name, processor, {
    connection,
    concurrency
  });
}

export function createQueueEvents(name: QueueName) {
  return new QueueEvents(name, { connection });
}

export function getQueue(name: QueueName) {
  switch (name) {
    case QUEUE_NAMES.ingest:
      return ingestQueue;
    case QUEUE_NAMES.enrich:
      return enrichQueue;
    case QUEUE_NAMES.update:
      return updateQueue;
    case QUEUE_NAMES.notify:
      return notifyQueue;
    default:
      throw new Error(`Queue ${name} not found`);
  }
}
