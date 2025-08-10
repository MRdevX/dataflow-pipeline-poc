import { z } from "zod";

const contactSchema = z.object({
	name: z.string().min(1).max(255),
	email: z.email(),
});

export const importRequestSchema = z.object({
	source: z.string().min(1).max(100),
	data: z.array(contactSchema).min(1),
	useResumable: z.boolean().optional().default(false),
});
