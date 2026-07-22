/** Pure Mux webhook helpers for STORY-9.3 (Deno edge + vitest). */

export type MuxWebhookAssetObject = {
  id?: string;
  passthrough?: string | null;
  playback_ids?: Array<{ id?: string; policy?: string }>;
  errors?: { type?: string; messages?: string[] };
};

export type MuxWebhookEvent = {
  id?: string;
  type?: string;
  data?: MuxWebhookAssetObject;
};

export type MuxLibraryUpdate =
  | {
      kind: 'ready';
      libraryItemId: string;
      muxAssetId: string;
      muxPlaybackId: string;
      mediaUrl: string;
      transcodeStatus: 'ready';
      idempotencyKey: string;
      eventType: string;
    }
  | {
      kind: 'error';
      libraryItemId: string;
      muxAssetId: string | null;
      transcodeStatus: 'error';
      idempotencyKey: string;
      eventType: string;
    }
  | {
      kind: 'skip';
      reason: string;
    };

export function buildMuxHlsPlaybackUrl(playbackId: string): string {
  return `https://stream.mux.com/${playbackId}.m3u8`;
}

export function pickPublicPlaybackId(
  playbackIds: Array<{ id?: string; policy?: string }> | undefined,
): string | null {
  if (!playbackIds?.length) {
    return null;
  }
  const publicId = playbackIds.find((entry) => entry.policy === 'public' && entry.id)?.id;
  if (publicId) {
    return publicId;
  }
  return playbackIds.find((entry) => entry.id)?.id ?? null;
}

/**
 * Map Mux video.asset.* events → coach_library_items update fields.
 * Uses asset.passthrough (set to library item id at Direct Upload create).
 */
export function mapMuxWebhookEvent(event: MuxWebhookEvent): MuxLibraryUpdate {
  const eventType = event.type || '';
  const idempotencyKey = event.id || `${eventType}:${event.data?.id || 'unknown'}`;
  const asset = event.data;
  const libraryItemId = asset?.passthrough?.trim() || '';

  if (!libraryItemId) {
    return { kind: 'skip', reason: 'missing_passthrough' };
  }

  if (eventType === 'video.asset.ready') {
    const muxAssetId = asset?.id;
    const muxPlaybackId = pickPublicPlaybackId(asset?.playback_ids);
    if (!muxAssetId || !muxPlaybackId) {
      return { kind: 'skip', reason: 'missing_playback' };
    }
    return {
      kind: 'ready',
      libraryItemId,
      muxAssetId,
      muxPlaybackId,
      mediaUrl: buildMuxHlsPlaybackUrl(muxPlaybackId),
      transcodeStatus: 'ready',
      idempotencyKey,
      eventType,
    };
  }

  if (
    eventType === 'video.asset.errored' ||
    eventType === 'video.asset.error' ||
    eventType === 'video.upload.errored'
  ) {
    return {
      kind: 'error',
      libraryItemId,
      muxAssetId: asset?.id ?? null,
      transcodeStatus: 'error',
      idempotencyKey,
      eventType,
    };
  }

  return { kind: 'skip', reason: `unhandled:${eventType}` };
}

/** Mux-Signature: t=<unix>,v1=<hmac_sha256_hex> over `${t}.${rawBody}`. */
export async function verifyMuxWebhookSignature(options: {
  rawBody: string;
  signatureHeader: string | null;
  secret: string;
  /** Clock skew tolerance in seconds (default 5 minutes). */
  toleranceSec?: number;
  nowSec?: number;
}): Promise<boolean> {
  const header = options.signatureHeader || '';
  const parts = Object.fromEntries(
    header.split(',').map((piece) => {
      const [k, ...rest] = piece.trim().split('=');
      return [k, rest.join('=')];
    }),
  ) as { t?: string; v1?: string };

  if (!parts.t || !parts.v1 || !options.secret) {
    return false;
  }

  const timestamp = Number(parts.t);
  if (!Number.isFinite(timestamp)) {
    return false;
  }

  const now = options.nowSec ?? Math.floor(Date.now() / 1000);
  const tolerance = options.toleranceSec ?? 300;
  if (Math.abs(now - timestamp) > tolerance) {
    return false;
  }

  const payload = `${parts.t}.${options.rawBody}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(options.secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  const expected = Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return timingSafeEqualHex(expected, parts.v1);
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
