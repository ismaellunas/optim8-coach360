/**
 * PUT a video file to a Mux Direct Upload URL with progress callbacks (STORY-9.3 AC-4).
 * Uses XMLHttpRequest so upload progress is available (fetch has no upload progress).
 */
export function putVideoToMux(uploadUrl, file, options = {}) {
  const onProgress = typeof options.onProgress === 'function' ? options.onProgress : null;

  return new Promise(function (resolve, reject) {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

    xhr.upload.onprogress = function (event) {
      if (!onProgress || !event.lengthComputable || event.total <= 0) {
        return;
      }
      const percent = Math.min(100, Math.round((event.loaded / event.total) * 100));
      onProgress({ loaded: event.loaded, total: event.total, percent });
    };

    xhr.onload = function () {
      if (xhr.status >= 200 && xhr.status < 300) {
        if (onProgress) {
          onProgress({ loaded: file.size, total: file.size, percent: 100 });
        }
        resolve({ status: xhr.status });
        return;
      }
      reject(new Error(`mux_upload_put_failed:http_${xhr.status}`));
    };

    xhr.onerror = function () {
      reject(new Error('mux_upload_put_failed:network'));
    };

    xhr.onabort = function () {
      reject(new Error('mux_upload_put_failed:aborted'));
    };

    xhr.send(file);
  });
}
