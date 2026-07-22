import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { canPlayHlsNatively, isHlsUrl } from '../lib/hlsPlayback.js';

/**
 * Adaptive streaming player: native HLS on iOS/Safari, hls.js on Android/Chrome (STORY-9.3 AC-3).
 */
export function SessionVideoPlayer({ src, title }) {
  const videoRef = useRef(null);
  /** Source that failed playback; cleared automatically when `src` changes. */
  const [failedSrc, setFailedSrc] = useState(null);
  const playbackError = Boolean(src) && failedSrc === src;
  const hlsUnsupported =
    Boolean(src) && isHlsUrl(src) && typeof document !== 'undefined'
      ? !canPlayHlsNatively(document.createElement('video')) && !Hls.isSupported()
      : false;

  useEffect(
    function () {
      const video = videoRef.current;
      if (!src || !video || playbackError || hlsUnsupported) {
        return undefined;
      }

      let hls = null;

      if (isHlsUrl(src)) {
        if (canPlayHlsNatively(video)) {
          video.src = src;
        } else if (Hls.isSupported()) {
          hls = new Hls({
            enableWorker: true,
            lowLatencyMode: false,
          });
          hls.loadSource(src);
          hls.attachMedia(video);
          hls.on(Hls.Events.ERROR, function (_event, data) {
            if (data?.fatal) {
              setFailedSrc(src);
            }
          });
        }
      } else {
        video.src = src;
      }

      return function () {
        if (hls) {
          hls.destroy();
        }
        video.removeAttribute('src');
        video.load();
      };
    },
    [src, playbackError, hlsUnsupported],
  );

  if (!src) {
    return (
      <div className="rounded-xl border border-dashed border-coach-border px-4 py-5 text-center font-body text-sm text-coach-t3">
        Video unavailable
      </div>
    );
  }

  if (playbackError || hlsUnsupported) {
    return (
      <div
        className="rounded-xl border border-dashed border-coach-border px-4 py-5 text-center font-body text-sm text-coach-t3"
        data-testid="session-video-player-error"
      >
        Video playback unavailable
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      data-testid="session-video-player"
      data-adaptive={isHlsUrl(src) ? 'hls' : 'progressive'}
      controls
      playsInline
      preload="metadata"
      className="w-full rounded-xl bg-black"
      aria-label={title ? `Video: ${title}` : 'Session video'}
    />
  );
}
