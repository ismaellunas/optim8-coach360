import { z } from 'zod';
import type { SessionContentRef } from '../session/content-refs.js';
import { sessionContentKindSchema } from '../session/content-refs.js';

/** Atomic coach-created kinds (packages are built via createCoachPackageInputSchema). */
export const coachCreatableKindSchema = z.enum(['drill', 'video', 'strategy']);

export type CoachCreatableKind = z.infer<typeof coachCreatableKindSchema>;

export const coachLibraryTranscodeStatusSchema = z.enum([
  'none',
  'pending',
  'ready',
  'error',
]);

export type CoachLibraryTranscodeStatus = z.infer<typeof coachLibraryTranscodeStatusSchema>;

export const createCoachLibraryItemInputSchema = z
  .object({
    kind: coachCreatableKindSchema,
    title: z.string().trim().min(1, 'title_required'),
    instructions: z
      .preprocess(
        (value) => (value === '' || value === undefined ? null : value),
        z.string().trim().min(1).nullable().optional(),
      ),
    mediaUrl: z
      .preprocess(
        (value) => (value === '' || value === undefined ? null : value),
        z.string().url().nullable().optional(),
      ),
  })
  .superRefine((data, ctx) => {
    if (data.kind === 'drill' && (data.instructions == null || data.instructions.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'instructions_required',
        path: ['instructions'],
      });
    }
  });

export type CreateCoachLibraryItemInput = z.infer<typeof createCoachLibraryItemInputSchema>;

export const createCoachPackageInputSchema = z.object({
  title: z.string().trim().min(1, 'title_required'),
  itemIds: z.array(z.string().uuid()).min(1, 'package_items_required'),
});

export type CreateCoachPackageInput = z.infer<typeof createCoachPackageInputSchema>;

export const coachLibraryItemSchema = z.object({
  id: z.string().uuid(),
  kind: sessionContentKindSchema,
  title: z.string().trim().min(1),
  source: z.literal('library'),
  instructions: z.string().nullable().optional(),
  mediaUrl: z.string().nullable().optional(),
  itemIds: z.array(z.string().uuid()).optional().default([]),
  muxUploadId: z.string().nullable().optional(),
  muxAssetId: z.string().nullable().optional(),
  muxPlaybackId: z.string().nullable().optional(),
  transcodeStatus: coachLibraryTranscodeStatusSchema.optional().default('none'),
});

export type CoachLibraryItemModel = z.infer<typeof coachLibraryItemSchema>;

export function normalizePackageItemIds(itemIds: ReadonlyArray<string>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of itemIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/** Session create prefill from a personal library item (STORY-9.2 AC-3). */
export function buildSessionPrefillFromLibraryItem(item: {
  id: string;
  kind: z.infer<typeof sessionContentKindSchema>;
  title: string;
}): {
  title: string;
  contentRefs: SessionContentRef[];
} {
  return {
    title: item.title,
    contentRefs: [
      {
        kind: item.kind,
        source: 'library',
        id: item.id,
        title: item.title,
        sortOrder: 0,
      },
    ],
  };
}
