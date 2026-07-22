// STORY-9.3 — Video upload and playback pipeline.

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  COACH_VIDEO_MAX_BYTES,
  assertCoachVideoWithinPolicy,
  buildMuxHlsUrl,
  isHlsUrl,
  mapContentError,
} from '@coach360/domain';
import {
  buildMuxHlsPlaybackUrl,
  mapMuxWebhookEvent,
  pickPublicPlaybackId,
  verifyMuxWebhookSignature,
} from '../../supabase/functions/mux-webhook/handler.ts';
import { REPO_ROOT } from '../helpers/supabase-test-env.js';

const CREATE_UI = path.join(
  REPO_ROOT,
  'apps',
  'mobile',
  'src',
  'features',
  'content',
  'ui',
  'CreateContentScreen.jsx',
);
const LIBRARY_UI = path.join(
  REPO_ROOT,
  'apps',
  'mobile',
  'src',
  'features',
  'content',
  'ui',
  'CoachLibraryScreen.jsx',
);
const PUT_HELPER = path.join(
  REPO_ROOT,
  'apps',
  'mobile',
  'src',
  'features',
  'content',
  'lib',
  'putVideoToMux.js',
);
const PLAYER = path.join(
  REPO_ROOT,
  'apps',
  'mobile',
  'src',
  'features',
  'session',
  'ui',
  'SessionVideoPlayer.jsx',
);
const SESSION_REPO = path.join(
  REPO_ROOT,
  'packages',
  'api',
  'src',
  'adapters',
  'supabase',
  'supabase-session-content-repository.ts',
);
const MUX_WEBHOOK_HANDLER = path.join(
  REPO_ROOT,
  'supabase',
  'functions',
  'mux-webhook',
  'handler.ts',
);
const MUX_WEBHOOK_INDEX = path.join(
  REPO_ROOT,
  'supabase',
  'functions',
  'mux-webhook',
  'index.ts',
);
const MOBILE_PKG = path.join(REPO_ROOT, 'apps', 'mobile', 'package.json');

describe('STORY_9_3 AC1 — video uploads accept files within max size policy', () => {
  it('test_STORY_9_3_AC1_rejects_oversize_accepts_within_policy', () => {
    expect(COACH_VIDEO_MAX_BYTES).toBe(500 * 1024 * 1024);

    expect(() =>
      assertCoachVideoWithinPolicy({
        size: 12 * 1024 * 1024,
        type: 'video/mp4',
        name: 'drill.mp4',
      }),
    ).not.toThrow();

    expect(() =>
      assertCoachVideoWithinPolicy({
        size: COACH_VIDEO_MAX_BYTES + 1,
        type: 'video/mp4',
        name: 'huge.mp4',
      }),
    ).toThrow(/video_too_large/);

    expect(mapContentError('video_too_large')).toMatch(/500 MB/i);

    const ui = readFileSync(CREATE_UI, 'utf8');
    expect(ui).toMatch(/assertCoachVideoWithinPolicy/);
    expect(ui).toMatch(/max 500 MB|COACH_VIDEO_MAX|video_too_large/);
  });
});

describe('STORY_9_3 AC2 — transcoding produces streamable formats', () => {
  it('test_STORY_9_3_AC2_asset_ready_writes_hls_playback', () => {
    const libraryItemId = '11111111-1111-1111-8111-111111111111';
    const ready = mapMuxWebhookEvent({
      id: 'evt_ready_1',
      type: 'video.asset.ready',
      data: {
        id: 'asset_abc',
        passthrough: libraryItemId,
        playback_ids: [{ id: 'play_xyz', policy: 'public' }],
      },
    });

    expect(ready.kind).toBe('ready');
    if (ready.kind !== 'ready') {
      throw new Error('expected ready');
    }
    expect(ready.libraryItemId).toBe(libraryItemId);
    expect(ready.muxAssetId).toBe('asset_abc');
    expect(ready.muxPlaybackId).toBe('play_xyz');
    expect(ready.mediaUrl).toBe(buildMuxHlsPlaybackUrl('play_xyz'));
    expect(ready.mediaUrl).toMatch(/\.m3u8$/);
    expect(ready.transcodeStatus).toBe('ready');

    const errored = mapMuxWebhookEvent({
      id: 'evt_err_1',
      type: 'video.asset.errored',
      data: { id: 'asset_bad', passthrough: libraryItemId },
    });
    expect(errored.kind).toBe('error');
    if (errored.kind === 'error') {
      expect(errored.transcodeStatus).toBe('error');
    }

    expect(pickPublicPlaybackId([{ id: 'a', policy: 'signed' }, { id: 'b', policy: 'public' }])).toBe(
      'b',
    );

    expect(existsSync(MUX_WEBHOOK_HANDLER)).toBe(true);
    expect(existsSync(MUX_WEBHOOK_INDEX)).toBe(true);
    const indexSrc = readFileSync(MUX_WEBHOOK_INDEX, 'utf8');
    expect(indexSrc).toMatch(/MUX_WEBHOOK_SECRET/);
    expect(indexSrc).toMatch(/mapMuxWebhookEvent/);
    expect(indexSrc).toMatch(/mux_playback_id/);
    expect(indexSrc).toMatch(/transcode_status:\s*'ready'/);
  });
});

describe('STORY_9_3 AC3 — adaptive streaming on iOS and Android', () => {
  it('test_STORY_9_3_AC3_hls_playback_url_and_adaptive_player', () => {
    const url = buildMuxHlsUrl('AbcPlayback123');
    expect(url).toBe('https://stream.mux.com/AbcPlayback123.m3u8');
    expect(isHlsUrl(url)).toBe(true);
    expect(isHlsUrl('https://example.com/clip.mp4')).toBe(false);

    const player = readFileSync(PLAYER, 'utf8');
    expect(player).toMatch(/hls\.js|from 'hls\.js'/);
    expect(player).toMatch(/canPlayHlsNatively|hlsPlayback/);
    expect(player).toMatch(/isHlsUrl|data-adaptive/);
    expect(player).toMatch(/data-adaptive/);
    expect(player).not.toMatch(/type="video\/mp4"/);

    const hlsHelper = path.join(
      REPO_ROOT,
      'apps',
      'mobile',
      'src',
      'features',
      'session',
      'lib',
      'hlsPlayback.js',
    );
    expect(existsSync(hlsHelper)).toBe(true);
    expect(readFileSync(hlsHelper, 'utf8')).toMatch(/canPlayHlsNatively/);

    const pkg = JSON.parse(readFileSync(MOBILE_PKG, 'utf8'));
    expect(pkg.dependencies['hls.js']).toBeTruthy();

    const sessionRepo = readFileSync(SESSION_REPO, 'utf8');
    expect(sessionRepo).toMatch(/mux_playback_id/);
    expect(sessionRepo).toMatch(/buildMuxHlsUrl/);
    expect(sessionRepo).toMatch(/transcode_status === 'ready'/);

    const libraryUi = readFileSync(LIBRARY_UI, 'utf8');
    expect(libraryUi).toMatch(/SessionVideoPlayer/);
    expect(libraryUi).toMatch(/transcodeStatus === 'ready'/);
  });
});

describe('STORY_9_3 AC4 — upload progress and error states', () => {
  it('test_STORY_9_3_AC4_upload_progress_and_error_ui', async () => {
    expect(existsSync(PUT_HELPER)).toBe(true);
    const putSrc = readFileSync(PUT_HELPER, 'utf8');
    expect(putSrc).toMatch(/XMLHttpRequest/);
    expect(putSrc).toMatch(/onprogress|upload\.onprogress/);
    expect(putSrc).toMatch(/onProgress/);
    expect(putSrc).toMatch(/percent/);

    const ui = readFileSync(CREATE_UI, 'utf8');
    expect(ui).toMatch(/create-content-upload-progress/);
    expect(ui).toMatch(/create-content-upload-percent/);
    expect(ui).toMatch(/create-content-error/);
    expect(ui).toMatch(/putVideoToMux/);
    expect(ui).toMatch(/setUploadPercent|uploadPercent/);
    expect(ui).toMatch(/mapContentError/);

    expect(mapContentError('mux_upload_put_failed:http_500')).toMatch(/upload failed/i);
    expect(mapContentError('video_file_required')).toMatch(/Select a video/i);

    const libraryUi = readFileSync(LIBRARY_UI, 'utf8');
    expect(libraryUi).toMatch(/mux error|transcodeStatus === 'error'/);

    const secret = 'test_mux_webhook_secret';
    const rawBody = '{"type":"video.asset.ready"}';
    const t = Math.floor(Date.now() / 1000);
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const sigBuf = await crypto.subtle.sign(
      'HMAC',
      key,
      new TextEncoder().encode(`${t}.${rawBody}`),
    );
    const v1 = Array.from(new Uint8Array(sigBuf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    const ok = await verifyMuxWebhookSignature({
      rawBody,
      signatureHeader: `t=${t},v1=${v1}`,
      secret,
      nowSec: t,
    });
    expect(ok).toBe(true);
    const bad = await verifyMuxWebhookSignature({
      rawBody,
      signatureHeader: `t=${t},v1=${'0'.repeat(64)}`,
      secret,
      nowSec: t,
    });
    expect(bad).toBe(false);
  });
});
