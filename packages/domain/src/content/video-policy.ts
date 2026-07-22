/** Coach video upload / Mux playback policy (STORY-9.3). */

/** Provisional max until stakeholder Q 12.4 is answered. */
export const COACH_VIDEO_MAX_BYTES = 500 * 1024 * 1024;

export type CoachVideoFileLike = {
  size: number;
  type?: string;
  name?: string;
};

export function isHlsUrl(url: string): boolean {
  return /\.m3u8(\?|$)/i.test(url) || /stream\.mux\.com/i.test(url);
}

export function buildMuxHlsUrl(playbackId: string): string {
  const id = playbackId?.trim();
  if (!id) {
    throw new Error('mux_playback_id_required');
  }
  return `https://stream.mux.com/${id}.m3u8`;
}

/**
 * Rejects oversized or non-video files before Mux initiate / PUT.
 * Throws machine codes consumed by mapContentError.
 */
export function assertCoachVideoWithinPolicy(file: CoachVideoFileLike | null | undefined): void {
  if (!file) {
    throw new Error('video_file_required');
  }
  if (typeof file.size !== 'number' || file.size <= 0) {
    throw new Error('video_file_required');
  }
  if (file.size > COACH_VIDEO_MAX_BYTES) {
    throw new Error('video_too_large');
  }
  const type = (file.type || '').toLowerCase();
  const name = (file.name || '').toLowerCase();
  const looksVideo =
    type.startsWith('video/') ||
    /\.(mp4|mov|m4v|webm|avi|mkv)$/i.test(name) ||
    (!type && !name);
  if (!looksVideo) {
    throw new Error('video_type_invalid');
  }
}
