import { defineField, defineType } from 'sanity';

export const ageRange = defineType({
  name: 'ageRange',
  title: 'Age range',
  type: 'object',
  fields: [
    defineField({
      name: 'min',
      title: 'Minimum age',
      type: 'number',
      validation: (Rule) => Rule.min(0).integer(),
    }),
    defineField({
      name: 'max',
      title: 'Maximum age',
      type: 'number',
      validation: (Rule) => Rule.min(0).integer(),
    }),
  ],
});
