import { z } from 'zod';

/** Atomic content or full package (OQ-3.4: package attaches as one unit). */
export const sessionContentKindSchema = z.enum(['drill', 'video', 'strategy', 'package']);

/** Personal library or marketplace purchase (OQ-3.3: both allowed). */
export const sessionContentSourceSchema = z.enum(['library', 'purchase']);

export const sessionContentRefSchema = z
  .object({
    kind: sessionContentKindSchema,
    source: sessionContentSourceSchema,
    id: z.string().min(1),
    title: z.string().trim().min(1),
    sortOrder: z.number().int().min(0),
  })
  .superRefine((data, ctx) => {
    if (data.source === 'purchase' && data.kind !== 'package') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'purchase_ref_must_be_package',
        path: ['kind'],
      });
    }
  });

export type SessionContentKind = z.infer<typeof sessionContentKindSchema>;
export type SessionContentSource = z.infer<typeof sessionContentSourceSchema>;
export type SessionContentRef = z.infer<typeof sessionContentRefSchema>;

export const sessionContentRefsSchema = z.array(sessionContentRefSchema);

export function normalizeContentRefs(
  refs: ReadonlyArray<SessionContentRef>,
): SessionContentRef[] {
  return refs.map((ref, index) => ({
    ...ref,
    sortOrder: index,
  }));
}

export function attachContentRef(
  refs: ReadonlyArray<SessionContentRef>,
  item: Omit<SessionContentRef, 'sortOrder'>,
): SessionContentRef[] {
  const parsed = sessionContentRefSchema.parse({
    ...item,
    sortOrder: refs.length,
  });
  return normalizeContentRefs([...refs, parsed]);
}
