import { createClient } from "@supabase/supabase-js";
import type { Task } from "graphile-worker";

export interface ImportJobPayload {
  jobId: string;
  source: string;
}

interface Contact {
  name: string;
  email: string;
  source: string;
}

interface ProcessedContact {
  id?: string;
  name: string;
  email: string;
  source: string;
  imported_at: string;
}

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const processImportJob: Task = async (payload, { logger }) => {
  const { jobId, source } = payload as ImportJobPayload;
  const fileName = `import-${jobId}.json`;

  const { data: fileData } = await supabase.storage.from("imports").download(fileName);
  const jsonText = await fileData!.text();
  const contacts: Contact[] = JSON.parse(jsonText);

  const contactsToInsert: ProcessedContact[] = contacts.map((contact: Contact) => ({
    name: contact.name,
    email: contact.email,
    source: source,
    imported_at: new Date().toISOString(),
  }));

  await supabase.from("contacts").insert(contactsToInsert);
  await supabase.storage.from("imports").remove([fileName]);
};

export default processImportJob;
