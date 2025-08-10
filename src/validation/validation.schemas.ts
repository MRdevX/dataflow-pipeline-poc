import { z } from "zod";

export const importRequestSchema = z.object({
  source: z.string().min(1, "Source is required"),
  data: z.array(z.any()).min(1, "At least one data record is required"),
});
