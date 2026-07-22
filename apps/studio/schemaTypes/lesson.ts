import { defineArrayMember, defineField, defineType } from 'sanity';

/** Lesson under a module — ordered refs to atomic content items. */
export const lesson = defineType({
  name: 'lesson',
  title: 'Lesson',
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
      rows: 3,
    }),
    defineField({
      name: 'items',
      title: 'Content items',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{ type: 'drill' }, { type: 'video' }, { type: 'strategy' }],
        }),
      ],
      validation: (Rule) => Rule.min(1),
    }),
  ],
  preview: {
    select: { title: 'title', items: 'items' },
    prepare: ({ title, items }) => ({
      title: title || 'Untitled lesson',
      subtitle: `${Array.isArray(items) ? items.length : 0} item(s)`,
    }),
  },
});
