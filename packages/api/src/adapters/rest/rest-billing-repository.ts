import { NotImplementedAdapterError } from '../../client/types.js';
import type { BillingInvoice } from '@coach360/domain';
import type {
  BillingRepository,
  CreateCheckoutSessionInput,
  CreateCheckoutSessionResult,
} from '../../ports/billing-repository.js';

export class RestBillingRepository implements BillingRepository {
  async listByProfileId(profileId: string): Promise<BillingInvoice[]> {
    void profileId;
    throw new NotImplementedAdapterError('rest', 'listBillingInvoices');
  }

  async createCheckoutSession(
    input: CreateCheckoutSessionInput,
  ): Promise<CreateCheckoutSessionResult> {
    void input;
    throw new NotImplementedAdapterError('rest', 'createCheckoutSession');
  }
}
