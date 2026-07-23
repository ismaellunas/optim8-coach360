import { defineArrayMember, defineField, defineType } from 'sanity';
import { publishedField, workflowStatusField } from './objects/workflowFields';

/** Marketplace / drip program root: program → module → lesson → item. */
export const trainingPackage = defineType({
  name: 'trainingPackage',
  title: 'Training package',
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
      rows: 5,
    }),
    defineField({
      name: 'skills',
      title: 'Skills',
      type: 'array',
      of: [defineArrayMember({ type: 'string' })],
      options: { layout: 'tags' },
    }),
    defineField({
      name: 'ageRange',
      title: 'Age range',
      type: 'ageRange',
    }),
    defineField({
      name: 'objectives',
      title: 'Objectives',
      type: 'array',
      of: [defineArrayMember({ type: 'string' })],
    }),
    defineField({
      name: 'modules',
      title: 'Modules',
      type: 'array',
      description: 'Drip units for this program.',
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{ type: 'module' }],
        }),
      ],
    }),
    workflowStatusField,
    publishedField,
    defineField({
      name: 'stripePriceId',
      title: 'Stripe price ID',
      type: 'string',
    }),
    defineField({
      name: 'priceCents',
      title: 'Display price (cents)',
      type: 'number',
      description: 'Catalog display amount in USD cents (e.g. 2900 = $29).',
      validation: (Rule) => Rule.min(0).integer(),
    }),
    defineField({
      name: 'rating',
      title: 'Rating',
      type: 'number',
      description: 'Catalog rating 0–5 (optional).',
      validation: (Rule) => Rule.min(0).max(5),
    }),
    defineField({
      name: 'dripSchedule',
      title: 'Drip schedule',
      type: 'object',
      fields: [
        defineField({
          name: 'intervalDays',
          title: 'Days between modules',
          type: 'number',
          validation: (Rule) => Rule.min(0).integer(),
        }),
        defineField({
          name: 'notes',
          title: 'Notes',
          type: 'text',
          rows: 2,
        }),
      ],
    }),
  ],
  preview: {
    select: { title: 'title', status: 'status', published: 'published' },
    prepare: ({ title, status, published }) => ({
      title: title || 'Untitled package',
      subtitle: `${status || 'draft'}${published ? ' · published' : ''}`,
    }),
  },
});
