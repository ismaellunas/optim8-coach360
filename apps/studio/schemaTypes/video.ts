import { defineField, defineType } from 'sanity';
import { publishedField, workflowStatusField } from './objects/workflowFields';

export const video = defineType({
  name: 'video',
  title: 'Video',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 4,
    }),
    defineField({
      name: 'muxAssetId',
      title: 'Mux asset ID',
      type: 'string',
      description: 'Filled by the upload pipeline (STORY-9.3). Optional until then.',
    }),
    defineField({
      name: 'muxPlaybackId',
      title: 'Mux playback ID',
      type: 'string',
    }),
    defineField({
      name: 'file',
      title: 'Source file',
      type: 'file',
      options: { accept: 'video/*' },
    }),
    workflowStatusField,
    publishedField,
  ],
  preview: {
    select: { title: 'title', status: 'status' },
    prepare: ({ title, status }) => ({
      title: title || 'Untitled video',
      subtitle: status ? `Status: ${status}` : '',
    }),
  },
});
