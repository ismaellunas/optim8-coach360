export type ContentItem = {
  id: string;
  title: string;
  status: 'published' | 'review' | 'draft';
};

export interface ContentRepository {
  list(): Promise<ContentItem[]>;
}
