/** Pure Sanity webhook helpers for STORY-9.5 (Deno edge + vitest). */

export const SANITY_SIGNATURE_HEADER = 'sanity-webhook-signature';

export type SanityWebhookDocument = {
  _id?: string;
  _type?: string;
  title?: string;
  description?: string | null;
  skills?: string[] | null;
  ageRange?: { min?: number | null; max?: number | null } | null;
  objectives?: string[] | null;
  stripePriceId?: string | null;
  dripSchedule?: Record<string, unknown> | null;
  status?: string | null;
  published?: boolean | null;
  modules?: Array<{ _ref?: string; _type?: string } | string> | null;
  /** When true (or operation delete), treat as unpublish/delete. */
  _deleted?: boolean;
};

export type PackageMetadataUpsert = {
  sanity_document_id: string;
  title: string;
  description: string | null;
  skills: string[];
  age_min: number | null;
  age_max: number | null;
  objectives: string[];
  stripe_price_id: string | null;
  drip_schedule: Record<string, unknown>;
  workflow_status: string | null;
  published: boolean;
  module_ids: string[];
};

export type RagEmbeddingJobInsert = {
  sanity_document_id: string;
  status: 'pending';
  payload: Record<string, unknown>;
};

export type SanityWebhookAction =
  | {
      kind: 'upsert_and_queue';
      metadata: PackageMetadataUpsert;
      ragJob: RagEmbeddingJobInsert;
      idempotencyKey: string;
    }
  | {
      kind: 'upsert_only';
      metadata: PackageMetadataUpsert;
      idempotencyKey: string;
      reason: string;
    }
  | {
      kind: 'skip';
      reason: string;
    };

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0);
}

function moduleIdsFromDoc(doc: SanityWebhookDocument): string[] {
  if (!Array.isArray(doc.modules)) return [];
  return doc.modules
    .map((entry) => {
      if (typeof entry === 'string') return entry;
      if (entry && typeof entry === 'object' && typeof entry._ref === 'string') return entry._ref;
      return null;
    })
    .filter((id): id is string => Boolean(id));
}

export function mapPackageMetadata(doc: SanityWebhookDocument): PackageMetadataUpsert | null {
  const id = doc._id?.trim();
  if (!id) return null;

  const published = doc._deleted === true ? false : Boolean(doc.published);
  return {
    sanity_document_id: id,
    title: (doc.title || '').trim() || 'Untitled package',
    description: doc.description?.trim() || null,
    skills: asStringArray(doc.skills),
    age_min: typeof doc.ageRange?.min === 'number' ? doc.ageRange.min : null,
    age_max: typeof doc.ageRange?.max === 'number' ? doc.ageRange.max : null,
    objectives: asStringArray(doc.objectives),
    stripe_price_id: doc.stripePriceId?.trim() || null,
    drip_schedule:
      doc.dripSchedule && typeof doc.dripSchedule === 'object' ? doc.dripSchedule : {},
    workflow_status: doc.status?.trim() || null,
    published,
    module_ids: moduleIdsFromDoc(doc),
  };
}

/**
 * Map a Sanity GROQ webhook document body → upsert (+ optional RAG queue).
 * Expects projection of a trainingPackage (see webhook-projection.groq).
 */
export function mapSanityWebhookPayload(
  doc: SanityWebhookDocument,
  options?: { idempotencyKey?: string | null },
): SanityWebhookAction {
  const type = doc._type || '';
  if (type && type !== 'trainingPackage') {
    return { kind: 'skip', reason: `unhandled_type:${type}` };
  }

  const metadata = mapPackageMetadata(doc);
  if (!metadata) {
    return { kind: 'skip', reason: 'missing_id' };
  }

  const idempotencyKey =
    options?.idempotencyKey?.trim() ||
    `sanity:${metadata.sanity_document_id}:${metadata.published ? 'pub' : 'unpub'}:${metadata.title}`;

  if (!metadata.published) {
    return {
      kind: 'upsert_only',
      metadata,
      idempotencyKey,
      reason: doc._deleted ? 'deleted' : 'unpublished',
    };
  }

  return {
    kind: 'upsert_and_queue',
    metadata,
    ragJob: {
      sanity_document_id: metadata.sanity_document_id,
      status: 'pending',
      payload: {
        title: metadata.title,
        description: metadata.description,
        skills: metadata.skills,
        objectives: metadata.objectives,
        module_ids: metadata.module_ids,
      },
    },
    idempotencyKey,
  };
}

/** Encode Sanity webhook signature header: t=<ms>,v1=<base64url hmac>. */
export async function encodeSanityWebhookSignature(
  rawBody: string,
  secret: string,
  timestampMs?: number,
): Promise<string> {
  const timestamp = timestampMs ?? Date.now();
  const signature = await createHs256Base64Url(rawBody, timestamp, secret);
  return `t=${timestamp},v1=${signature}`;
}

export async function verifySanityWebhookSignature(options: {
  rawBody: string;
  signatureHeader: string | null;
  secret: string;
}): Promise<boolean> {
  const header = options.signatureHeader?.trim() || '';
  if (!header || !options.secret) return false;

  const match = header.match(/^t=(\d+)[, ]+v1=([^, ]+)$/);
  if (!match) return false;

  const timestamp = Number(match[1]);
  if (!Number.isFinite(timestamp) || timestamp < 1_609_459_200_000) return false;

  const expected = await encodeSanityWebhookSignature(
    options.rawBody,
    options.secret,
    timestamp,
  );
  return timingSafeEqualString(expected, header);
}

async function createHs256Base64Url(
  stringifiedPayload: string,
  timestampMs: number,
  secret: string,
): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signaturePayload = `${timestampMs}.${stringifiedPayload}`;
  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(signaturePayload));
  const bytes = Array.from(new Uint8Array(signature));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function timingSafeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
