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
  id: string;
  name: string;
  email: string;
  source: string;
  imported_at: string;
}

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const processImportJob: Task = async (payload, { logger }) => {
  const { jobId, source } = payload as ImportJobPayload;

  logger.info(`Starting import job ${jobId} from source: ${source}`);
};

export default processImportJob;
