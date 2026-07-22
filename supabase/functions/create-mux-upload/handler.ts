/** Pure Mux Direct Upload helpers for STORY-9.2 (Deno edge + vitest). */

export type MuxDirectUploadCreateBody = {
  cors_origin: string;
  new_asset_settings: {
    playback_policy: string[];
    passthrough?: string;
  };
};

export type MuxDirectUploadResult = {
  uploadId: string;
  uploadUrl: string;
};

export function muxBasicAuthHeader(tokenId: string, tokenSecret: string): string {
  const raw = `${tokenId}:${tokenSecret}`;
  // btoa is available in Deno and browsers; Node vitest polyfills via Buffer.
  if (typeof btoa === 'function') {
    return `Basic ${btoa(raw)}`;
  }
  return `Basic ${Buffer.from(raw, 'utf8').toString('base64')}`;
}

export function buildMuxDirectUploadBody(
  corsOrigin: string,
  libraryItemId: string,
): MuxDirectUploadCreateBody {
  if (!corsOrigin) {
    throw new Error('mux_cors_origin_required');
  }
  if (!libraryItemId) {
    throw new Error('library_item_id_required');
  }
  return {
    cors_origin: corsOrigin,
    new_asset_settings: {
      playback_policy: ['public'],
      passthrough: libraryItemId,
    },
  };
}

export function parseMuxUploadResponse(json: unknown): MuxDirectUploadResult {
  const root = json as { data?: { id?: string; url?: string } } | null;
  const uploadId = root?.data?.id;
  const uploadUrl = root?.data?.url;
  if (!uploadId || !uploadUrl) {
    throw new Error('mux_initiate_failed:invalid_response');
  }
  return { uploadId, uploadUrl };
}

export async function createMuxDirectUpload(options: {
  tokenId: string;
  tokenSecret: string;
  corsOrigin: string;
  libraryItemId: string;
  fetchImpl?: typeof fetch;
}): Promise<MuxDirectUploadResult> {
  if (!options.tokenId || !options.tokenSecret) {
    throw new Error('mux_credentials_missing');
  }

  const fetchFn = options.fetchImpl ?? fetch;
  const body = buildMuxDirectUploadBody(options.corsOrigin, options.libraryItemId);

  const response = await fetchFn('https://api.mux.com/video/v1/uploads', {
    method: 'POST',
    headers: {
      Authorization: muxBasicAuthHeader(options.tokenId, options.tokenSecret),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`mux_initiate_failed:http_${response.status}`);
  }

  const json = await response.json();
  return parseMuxUploadResponse(json);
}
