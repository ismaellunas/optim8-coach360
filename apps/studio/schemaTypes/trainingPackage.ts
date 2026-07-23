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
      title: 'Display price (minor units)',
      type: 'number',
      description:
        'Catalog display amount in the currency below, expressed in minor units (e.g. 2900 = $29.00 for USD or 29.00 kr for SEK).',
      validation: (Rule) => Rule.min(0).integer(),
    }),
    defineField({
      name: 'currency',
      title: 'Currency',
      type: 'string',
      description:
        'ISO 4217 code matching the Stripe Price this package charges (usd, sek, eur, …). Defaults to usd when empty.',
      validation: (Rule) =>
        Rule.custom((value) => {
          if (value === undefined || value === null || value === '') return true;
          if (typeof value !== 'string') return 'Must be a string';
          return /^[A-Za-z]{3}$/.test(value.trim())
            ? true
            : 'Must be a 3-letter ISO 4217 code (e.g. usd, sek, eur)';
        }),
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
      description:
        'OQ-14.1 — Coach Pro configures per package. OQ-14.2 — weekly (7), biweekly (14), or any custom positive day count.',
      fields: [
        defineField({
          name: 'intervalDays',
          title: 'Days between modules',
          type: 'number',
          description: 'Positive days between module unlocks (7 = weekly, 14 = biweekly, or custom).',
          validation: (Rule) => Rule.min(1).integer(),
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
