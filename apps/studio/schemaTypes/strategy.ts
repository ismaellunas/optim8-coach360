import { defineField, defineType } from 'sanity';
import { publishedField, workflowStatusField } from './objects/workflowFields';

export const strategy = defineType({
  name: 'strategy',
  title: 'Strategy / Playbook',
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
      name: 'diagram',
      title: 'Diagram',
      type: 'image',
      options: { hotspot: true },
    }),
    workflowStatusField,
    publishedField,
  ],
  preview: {
    select: { title: 'title', status: 'status', media: 'diagram' },
    prepare: ({ title, status, media }) => ({
      title: title || 'Untitled strategy',
      subtitle: status ? `Status: ${status}` : '',
      media,
    }),
  },
});
