import type { SessionInput } from './schema.js';

export const SESSION_MVP_TYPES: ReadonlyArray<{
  value: SessionInput['sessionType'];
  label: string;
}> = [
  { value: 'practice', label: 'Practice' },
  { value: 'film', label: 'Film review' },
  { value: 'individual', label: '1-on-1' },
];
