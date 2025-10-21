import ingestProcessor from "@/worker/processors/ingest";
import enrichProcessor from "@/worker/processors/enrich";
import updateProcessor from "@/worker/processors/update";
import notifyProcessor from "@/worker/processors/notify";
import { createWorker, QUEUE_NAMES } from "@/lib/queue";

const workers = [
  createWorker(QUEUE_NAMES.ingest, ingestProcessor, 1),
  createWorker(QUEUE_NAMES.enrich, enrichProcessor, 3),
  createWorker(QUEUE_NAMES.update, updateProcessor, 2),
  createWorker(QUEUE_NAMES.notify, notifyProcessor, 1)
];

for (const worker of workers) {
  worker.on("error", (error) => {
    // eslint-disable-next-line no-console
    console.error(`[Worker:${worker.name}]`, error);
  });
}

function shutdown() {
  // eslint-disable-next-line no-console
  console.log("Shutting down workers...");
  Promise.allSettled(workers.map((worker) => worker.close()))
    .then(() => process.exit(0))
    .catch((error) => {
      // eslint-disable-next-line no-console
      console.error("Failed to close workers", error);
      process.exit(1);
    });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
