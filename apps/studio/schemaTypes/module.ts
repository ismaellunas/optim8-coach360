import { defineArrayMember, defineField, defineType } from 'sanity';

/** Drip unit under a training package — ordered lesson refs. */
export const module = defineType({
  name: 'module',
  title: 'Module',
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
      name: 'lessons',
      title: 'Lessons',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{ type: 'lesson' }],
        }),
      ],
    }),
  ],
  preview: {
    select: { title: 'title', lessons: 'lessons' },
    prepare: ({ title, lessons }) => ({
      title: title || 'Untitled module',
      subtitle: `${Array.isArray(lessons) ? lessons.length : 0} lesson(s)`,
    }),
  },
});
