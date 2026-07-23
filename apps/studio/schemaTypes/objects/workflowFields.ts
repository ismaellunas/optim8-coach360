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
  description:
    'Set true after approval to list on the marketplace. Requires status=approved and a Stripe price ID.',
  initialValue: false,
  validation: (Rule) =>
    Rule.custom((published, context) => {
      if (published !== true) return true;
      const parent = context.parent as {
        status?: string;
        stripePriceId?: string | null;
      } | null;
      if (parent?.status !== 'approved') {
        return 'Publish requires workflow status Approved';
      }
      if (!parent?.stripePriceId?.trim()) {
        return 'Publish requires a Stripe price ID';
      }
      return true;
    }),
});

export const WORKFLOW_STATUS_VALUES = [
  'draft',
  'pending_review',
  'approved',
  'rejected',
] as const;

export type WorkflowStatus = (typeof WORKFLOW_STATUS_VALUES)[number];
