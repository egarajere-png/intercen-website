export type ContentType =
  | 'book'
  | 'ebook'
  | 'document'
  | 'paper'
  | 'report'
  | 'manual'
  | 'guide';

export type ContentFormat = 'pdf' | 'epub' | 'mobi' | 'docx' | 'txt';

export type ContentStatus =
  | 'draft'
  | 'pending_review'
  | 'published'
  | 'archived'
  | 'discontinued';

export type ContentVisibility = 'public' | 'private' | 'organization' | 'restricted';
export type ContentAccessLevel = 'free' | 'paid' | 'subscription' | 'organization_only';
export type ContentConfidentiality = 'public' | 'internal' | 'confidential' | 'restricted';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parenrt_id?: string;
  icon_url?: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
}

export interface Content {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  content_type: ContentType;
  format?: ContentFormat;
  author?: string;
  publisher?: string;
  published_date?: string;
  category_id?: string;
  language?: string;
  cover_image_url?: string;
  file_url?: string;
  file_size_bytes?: number;
  page_count?: number;
  price: number;
  is_free: boolean;
  is_for_sale: boolean;
  stock_quantity: number;
  isbn?: string;
  is_featured: boolean;
  is_bestseller: boolean;
  is_new_arrival: boolean;
  average_rating: number;
  total_reviews: number;
  total_downloads: number;
  view_count: number;
  visibility: ContentVisibility;
  access_level: ContentAccessLevel;
  document_number?: string;
  version: string;
  department?: string;
  confidentiality?: ContentConfidentiality;
  status: ContentStatus;
  uploaded_by?: string;
  organization_id?: string;
  meta_keywords?: string[];
  search_vector?: unknown;
  created_at: string;
  updated_at: string;
  published_at?: string;
}

export interface ContentFile {
  id: string;
  content_id: string;
  file_name: string;
  file_url: string;
  file_type?: string;
  file_size_bytes?: number;
  mime_type?: string;
  storage_path?: string;
  version: string;
  is_primary: boolean;
  uploaded_by?: string;
  uploaded_at: string;
}

export interface ContentTag {
  content_id: string;
  tag_id: string;
}
