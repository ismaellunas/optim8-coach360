import { isHlsUrl } from '@coach360/domain';

/** True when the browser can play HLS natively (Safari / iOS WebView). */
export function canPlayHlsNatively(videoEl) {
  if (!videoEl || typeof videoEl.canPlayType !== 'function') {
    return false;
  }
  return videoEl.canPlayType('application/vnd.apple.mpegurl') !== '';
}

export { isHlsUrl };
