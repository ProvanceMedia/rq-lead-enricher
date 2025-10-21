import { ingestQueue } from "@/lib/queue";
import { getServerEnv } from "@/lib/env";

async function main() {
  const env = getServerEnv();

  await ingestQueue.add("daily-prospect-pull", {
    limit: env.DAILY_QUOTA
  });

  // eslint-disable-next-line no-console
  console.log(
    `Enqueued daily prospect pull with limit ${env.DAILY_QUOTA}`
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error("Failed to enqueue daily prospect pull", error);
    process.exit(1);
  });
