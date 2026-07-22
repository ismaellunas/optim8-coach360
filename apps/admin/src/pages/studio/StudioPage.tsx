import { Studio } from 'sanity';
import { createSanityConfig } from '@coach360/studio';

const studioConfig = createSanityConfig({
  basePath: '/admin/studio',
  projectId: import.meta.env.VITE_SANITY_PROJECT_ID || 'wv7uz07u',
  dataset: import.meta.env.VITE_SANITY_DATASET || 'production',
});

/**
 * Embedded Sanity Studio for content authoring (STORY-9.1).
 * Mounted full-bleed outside AdminShell chrome.
 */
export function StudioPage() {
  return (
    <div style={{ height: '100vh', maxHeight: '100dvh' }}>
      <Studio config={studioConfig} />
    </div>
  );
}
