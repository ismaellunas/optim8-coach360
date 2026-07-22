import {
  mapSanityPackageToCatalog,
  PUBLISHED_PACKAGES_GROQ,
  type MarketplaceCatalogPackage,
} from '@coach360/domain';
import type { MarketplaceCatalogRepository } from '../../ports/marketplace-catalog-repository.js';

export type SanityCatalogEnv = {
  projectId: string;
  dataset: string;
  /** Viewer (or Editor) token required when the dataset is private. */
  token?: string;
  apiVersion?: string;
  /** Prefer CDN when public; with a token, API host is used. */
  useCdn?: boolean;
};

/**
 * Reads published training packages from Sanity CDN/API (STORY-9.5 AC-4).
 */
export class SanityMarketplaceCatalogRepository implements MarketplaceCatalogRepository {
  private readonly projectId: string;
  private readonly dataset: string;
  private readonly token: string;
  private readonly apiVersion: string;
  private readonly useCdn: boolean;

  constructor(env: SanityCatalogEnv) {
    this.projectId = env.projectId.trim();
    this.dataset = env.dataset.trim() || 'production';
    this.token = env.token?.trim() || '';
    this.apiVersion = env.apiVersion?.trim() || '2021-10-21';
    this.useCdn = env.useCdn ?? !this.token;
  }

  async listPublished(): Promise<MarketplaceCatalogPackage[]> {
    if (!this.projectId) {
      throw new Error('sanity_project_id_missing');
    }

    const host = this.useCdn
      ? `${this.projectId}.apicdn.sanity.io`
      : `${this.projectId}.api.sanity.io`;
    const url = new URL(`https://${host}/v${this.apiVersion}/data/query/${this.dataset}`);
    url.searchParams.set('query', PUBLISHED_PACKAGES_GROQ);

    const headers: Record<string, string> = {};
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const res = await fetch(url, { headers });
    const body = (await res.json().catch(() => ({}))) as {
      result?: unknown[];
      message?: string;
      error?: { description?: string };
    };

    if (!res.ok) {
      const detail = body.error?.description || body.message || res.statusText;
      throw new Error(`sanity_catalog_fetch_failed:${res.status}:${detail}`);
    }

    const rows = Array.isArray(body.result) ? body.result : [];
    return rows
      .map((row) => mapSanityPackageToCatalog(row as Parameters<typeof mapSanityPackageToCatalog>[0]))
      .filter((pkg): pkg is MarketplaceCatalogPackage => Boolean(pkg));
  }
}
