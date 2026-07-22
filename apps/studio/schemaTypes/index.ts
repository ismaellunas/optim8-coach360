import { ageRange } from './objects/ageRange';
import { drill } from './drill';
import { lesson } from './lesson';
import { module } from './module';
import { strategy } from './strategy';
import { trainingPackage } from './trainingPackage';
import { video } from './video';

/** Document types required by STORY-9.1 AC-1. */
export const CONTENT_DOCUMENT_TYPES = [
  'drill',
  'video',
  'strategy',
  'trainingPackage',
  'module',
] as const;

export const schemaTypes = [
  ageRange,
  drill,
  video,
  strategy,
  lesson,
  module,
  trainingPackage,
];
