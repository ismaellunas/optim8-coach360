export function SessionVideoPlayer({ src, title }) {
  if (!src) {
    return (
      <div className="rounded-xl border border-dashed border-coach-border px-4 py-5 text-center font-body text-sm text-coach-t3">
        Video unavailable
      </div>
    );
  }

  return (
    <video
      data-testid="session-video-player"
      controls
      playsInline
      preload="metadata"
      className="w-full rounded-xl bg-black"
      aria-label={title ? `Video: ${title}` : 'Session video'}
    >
      <source src={src} type="video/mp4" />
    </video>
  );
}
