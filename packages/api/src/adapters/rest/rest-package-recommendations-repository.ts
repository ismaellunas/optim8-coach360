import { NotImplementedAdapterError } from '../../client/types.js';
import type {
  ListPackageRecommendationsInput,
  ListPackageRecommendationsResult,
  PackageRecommendationsRepository,
} from '../../ports/package-recommendations-repository.js';

export class RestPackageRecommendationsRepository implements PackageRecommendationsRepository {
  async listRecommendations(
    input?: ListPackageRecommendationsInput,
  ): Promise<ListPackageRecommendationsResult> {
    void input;
    throw new NotImplementedAdapterError('rest', 'listPackageRecommendations');
  }
}
