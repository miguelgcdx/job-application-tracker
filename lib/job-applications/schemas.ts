import { z } from "zod";

export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i).transform((id) => id.toLowerCase());
export const actorSchema = z.string().trim().min(1);
const requiredText = z.string().trim().min(1);
const fields = {
  company: requiredText,
  position: requiredText,
  location: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  salary: z.string().trim().optional(),
  jobUrl: z.string().trim().pipe(z.union([z.literal(""), z.url({ protocol: /^https?$/ })])).optional(),
  tags: z.array(requiredText).optional(),
  description: z.string().trim().optional(),
};

export const createJobSchema = z.strictObject({
  ...fields,
  columnId: objectIdSchema,
  boardId: objectIdSchema,
});
export const updateJobSchema = z.strictObject({
  ...fields,
  company: requiredText.optional(),
  position: requiredText.optional(),
  columnId: objectIdSchema.optional(),
  order: z.number().int().nonnegative().optional(),
}).refine((input) => Object.values(input).some((value) => value !== undefined));

export type CreateJobInput = z.infer<typeof createJobSchema>;
export type UpdateJobInput = z.infer<typeof updateJobSchema>;
