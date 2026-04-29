export interface Folder {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  pages: PageSummary[];
}

export interface PageSummary {
  id: string;
  title: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export interface Page {
  id: string;
  title: string;
  slug: string;
  content: any;
  folderId: string | null;
  createdAt: string;
  updatedAt: string;
}
