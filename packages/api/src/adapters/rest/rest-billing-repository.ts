import { NotImplementedAdapterError } from '../../client/types.js';
import type { BillingInvoice } from '@coach360/domain';
import type { BillingRepository } from '../../ports/billing-repository.js';

export class RestBillingRepository implements BillingRepository {
  async listByProfileId(profileId: string): Promise<BillingInvoice[]> {
    void profileId;
    throw new NotImplementedAdapterError('rest', 'listBillingInvoices');
  }
}
