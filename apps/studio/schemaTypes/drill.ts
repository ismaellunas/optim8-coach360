import { defineArrayMember, defineField, defineType } from 'sanity';
import { publishedField, workflowStatusField } from './objects/workflowFields';

export const drill = defineType({
  name: 'drill',
  title: 'Drill',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'instructions',
      title: 'Instructions',
      type: 'text',
      rows: 6,
    }),
    defineField({
      name: 'media',
      title: 'Media',
      type: 'array',
      of: [
        defineArrayMember({ type: 'image', options: { hotspot: true } }),
        defineArrayMember({ type: 'file' }),
      ],
    }),
    defineField({
      name: 'skills',
      title: 'Skills',
      type: 'array',
      of: [defineArrayMember({ type: 'string' })],
      options: { layout: 'tags' },
    }),
    workflowStatusField,
    publishedField,
  ],
  preview: {
    select: { title: 'title', status: 'status' },
    prepare: ({ title, status }) => ({
      title: title || 'Untitled drill',
      subtitle: status ? `Status: ${status}` : '',
    }),
  },
});
