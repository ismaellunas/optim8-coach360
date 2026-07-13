import type { BillingInvoice } from '@coach360/domain';

export interface BillingRepository {
  listByProfileId(profileId: string): Promise<BillingInvoice[]>;
}
