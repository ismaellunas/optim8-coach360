import { defineField } from 'sanity';

/** Shared marketplace workflow: draft → pending_review → approved|rejected → published. */
export const workflowStatusField = defineField({
  name: 'status',
  title: 'Workflow status',
  type: 'string',
  options: {
    list: [
      { title: 'Draft', value: 'draft' },
      { title: 'Pending review', value: 'pending_review' },
      { title: 'Approved', value: 'approved' },
      { title: 'Rejected', value: 'rejected' },
    ],
    layout: 'radio',
  },
  initialValue: 'draft',
  validation: (Rule) => Rule.required(),
});

export const publishedField = defineField({
  name: 'published',
  title: 'Published',
  type: 'boolean',
  description: 'Set true after approval to list on the marketplace.',
  initialValue: false,
});

export const WORKFLOW_STATUS_VALUES = [
  'draft',
  'pending_review',
  'approved',
  'rejected',
] as const;

export type WorkflowStatus = (typeof WORKFLOW_STATUS_VALUES)[number];
