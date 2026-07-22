import { defineCliConfig } from 'sanity/cli';

const projectId = process.env.SANITY_STUDIO_PROJECT_ID || 'wv7uz07u';
const dataset = process.env.SANITY_STUDIO_DATASET || 'production';

export default defineCliConfig({
  api: { projectId, dataset },
  studioHost: 'coach360',
});
