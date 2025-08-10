import { run } from "graphile-worker";
import { createClient } from "@supabase/supabase-js";
import type { ImportJobPayload } from "../tasks/import.js";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function processImport(payload: any, helpers: any) {
  const { jobId, source } = payload as ImportJobPayload;
  const fileName = `import-${jobId}.json`;

  const { data: fileData } = await supabase.storage.from("imports").download(fileName);
  const jsonText = await fileData!.text();
  const contacts = JSON.parse(jsonText);

  const contactsToInsert = contacts.map((contact: any) => ({
    name: contact.name,
    email: contact.email,
    source: source,
    imported_at: new Date().toISOString(),
  }));

  await supabase.from("contacts").insert(contactsToInsert);
  await supabase.storage.from("imports").remove([fileName]);
}

async function main() {
  const connectionString = process.env.DATABASE_URL!;

  const runner = await run({
    connectionString,
    concurrency: 5,
    noHandleSignals: false,
    pollInterval: 1000,
    taskList: {
      processImport,
    },
  });

  process.on("SIGINT", async () => {
    await runner.stop();
    process.exit(0);
  });
}

main().catch((error) => {
  process.exit(1);
});
