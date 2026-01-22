# Database Documentation
## Hybrid E-commerce & Corporate Library System

---

## Table of Contents
1. [Overview](#overview)
2. [Database Architecture](#database-architecture)
3. [Entity Relationship Diagram](#entity-relationship-diagram)
4. [Data Dictionary](#data-dictionary)
5. [Table Relationships](#table-relationships)
6. [Row Level Security (RLS) Policies](#row-level-security-policies)
7. [Indexes & Performance](#indexes--performance)
8. [Triggers & Functions](#triggers--functions)
9. [Views](#views)
10. [Migration Guide](#migration-guide)
11. [Query Examples](#query-examples)
12. [Best Practices](#best-practices)

---

## Overview

### System Purpose
A hybrid platform that combines:
- **E-commerce bookstore** - Sell books online with cart, orders, and payments
- **Corporate document repository** - Manage organizational documents with version control and access control

### Technology Stack
- **Database**: PostgreSQL (via Supabase)
- **Extensions**: uuid-ossp, pg_trgm
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage

### Key Features
- Multi-tenant organization support
- E-commerce with shopping cart and orders
- Document management with versioning
- Full-text search capabilities
- Reading progress tracking
- Reviews and ratings
- Publishing requests workflow
- Analytics and tracking

---

## Database Architecture

### Design Principles
1. **Single Responsibility**: Each table has a clear, focused purpose
2. **Polymorphic Content**: Books and documents share a unified content table
3. **Security First**: Row Level Security (RLS) on all tables
4. **Performance**: Strategic indexing and full-text search
5. **Audit Trail**: Timestamps on all tables (created_at, updated_at)

### Schema Organization
```
├── User Management (profiles, organizations, organization_members)
├── Content System (content, content_files, version_history)
├── Categorization (categories, tags, content_tags)
├── E-commerce (carts, cart_items, orders, order_items)
├── Collections (collections, collection_items)
├── Reading Experience (reading_progress, bookmarks, annotations)
├── Social (reviews)
├── Publishing (publishing_requests)
├── Marketing (banners)
├── Support (contact_messages)
└── Analytics (download_history, search_logs)
```

---

## Entity Relationship Diagram

### Core Relationships

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   profiles  │────────▶│organizations │◀────────│organization_│
│             │  1:N    │              │   N:M   │  members    │
└─────────────┘         └──────────────┘         └─────────────┘
       │                        │
       │ 1:N                    │ 1:N
       ▼                        ▼
┌─────────────┐         ┌──────────────┐
│   content   │         │ collections  │
│ (books &    │         │              │
│  documents) │         └──────────────┘
└─────────────┘                │
       │                       │ N:M
       │ N:M                   ▼
       ▼                ┌──────────────┐
┌─────────────┐        │ collection_  │
│    tags     │        │    items     │
└─────────────┘        └──────────────┘
       │
       │ N:M
       ▼
┌─────────────┐
│content_tags │
└─────────────┘

┌─────────────┐         ┌──────────────┐
│   profiles  │────────▶│    carts     │
│             │  1:1    │              │
└─────────────┘         └──────────────┘
       │                        │
       │ 1:N                    │ 1:N
       ▼                        ▼
┌─────────────┐         ┌──────────────┐
│   orders    │         │  cart_items  │
│             │         │              │
└─────────────┘         └──────────────┘
       │                        │
       │ 1:N                    │ N:1
       ▼                        ▼
┌─────────────┐         ┌──────────────┐
│ order_items │────────▶│   content    │
│             │         │              │
└─────────────┘         └──────────────┘
```

---

## Data Dictionary

### 1. profiles
Extends Supabase auth.users with additional user information.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | No | - | Primary key, references auth.users(id) |
| full_name | VARCHAR(255) | Yes | NULL | User's full name |
| avatar_url | VARCHAR(500) | Yes | NULL | Profile picture URL |
| phone | VARCHAR(20) | Yes | NULL | Contact phone number |
| address | TEXT | Yes | NULL | Physical address |
| bio | TEXT | Yes | NULL | User biography |
| organization | VARCHAR(255) | Yes | NULL | Company/institution name |
| department | VARCHAR(255) | Yes | NULL | Department within organization |
| role | VARCHAR(50) | Yes | 'reader' | User role: reader, author, publisher, admin, corporate_user |
| account_type | VARCHAR(20) | Yes | 'personal' | Account type: personal, corporate, institutional |
| is_verified | BOOLEAN | Yes | FALSE | Email verification status |
| created_at | TIMESTAMPTZ | Yes | NOW() | Account creation timestamp |
| updated_at | TIMESTAMPTZ | Yes | NOW() | Last update timestamp |

**Constraints:**
- CHECK: role IN ('reader', 'author', 'publisher', 'admin', 'corporate_user')
- CHECK: account_type IN ('personal', 'corporate', 'institutional')

**Indexes:**
- idx_profiles_role ON role
- idx_profiles_account_type ON account_type

---

### 2. organizations
Corporate or institutional entities that can have multiple users.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | No | uuid_generate_v4() | Primary key |
| name | VARCHAR(255) | No | - | Organization name |
| logo_url | VARCHAR(500) | Yes | NULL | Organization logo |
| website | VARCHAR(255) | Yes | NULL | Organization website |
| contact_email | VARCHAR(255) | Yes | NULL | Contact email |
| address | TEXT | Yes | NULL | Physical address |
| subscription_tier | VARCHAR(50) | Yes | 'basic' | Subscription level: basic, professional, enterprise |
| max_users | INTEGER | Yes | 10 | Maximum allowed users |
| storage_limit_gb | INTEGER | Yes | 100 | Storage limit in GB |
| is_active | BOOLEAN | Yes | TRUE | Organization active status |
| created_at | TIMESTAMPTZ | Yes | NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | Yes | NOW() | Last update timestamp |

**Constraints:**
- CHECK: subscription_tier IN ('basic', 'professional', 'enterprise')

---

### 3. organization_members
Links users to organizations with specific roles.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | No | uuid_generate_v4() | Primary key |
| organization_id | UUID | No | - | Foreign key to organizations |
| user_id | UUID | No | - | Foreign key to profiles |
| role | VARCHAR(50) | Yes | 'member' | Role: owner, admin, member, viewer |
| joined_at | TIMESTAMPTZ | Yes | NOW() | Membership start timestamp |

**Constraints:**
- CHECK: role IN ('owner', 'admin', 'member', 'viewer')
- UNIQUE: (organization_id, user_id)
- Foreign Keys: organization_id → organizations(id), user_id → profiles(id)

**Indexes:**
- idx_org_members_org ON organization_id
- idx_org_members_user ON user_id

---

### 4. categories
Hierarchical categorization for content.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | No | uuid_generate_v4() | Primary key |
| name | VARCHAR(100) | No | - | Category name (unique) |
| slug | VARCHAR(100) | No | - | URL-friendly slug (unique) |
| description | TEXT | Yes | NULL | Category description |
| parent_id | UUID | Yes | NULL | Parent category for hierarchy |
| icon | VARCHAR(100) | Yes | NULL | Icon identifier |
| is_active | BOOLEAN | Yes | TRUE | Category active status |
| sort_order | INTEGER | Yes | 0 | Display order |
| created_at | TIMESTAMPTZ | Yes | NOW() | Creation timestamp |

**Constraints:**
- UNIQUE: name, slug
- Foreign Key: parent_id → categories(id)

**Example Hierarchy:**
```
Books (parent_id: NULL)
  ├── Fiction (parent_id: Books.id)
  │   ├── Mystery (parent_id: Fiction.id)
  │   └── Romance (parent_id: Fiction.id)
  └── Non-Fiction (parent_id: Books.id)
```

---

### 5. tags
Flexible tagging system for content.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | No | uuid_generate_v4() | Primary key |
| name | VARCHAR(100) | No | - | Tag name (unique) |
| slug | VARCHAR(100) | No | - | URL-friendly slug (unique) |
| created_at | TIMESTAMPTZ | Yes | NOW() | Creation timestamp |

**Constraints:**
- UNIQUE: name, slug

---

### 6. content
**Core table** - Handles both books (e-commerce) and documents (corporate).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | No | uuid_generate_v4() | Primary key |
| title | VARCHAR(500) | No | - | Content title |
| subtitle | VARCHAR(500) | Yes | NULL | Content subtitle |
| description | TEXT | Yes | NULL | Detailed description |
| content_type | VARCHAR(50) | No | - | Type: book, ebook, document, paper, report, manual, guide |
| format | VARCHAR(20) | Yes | NULL | File format: pdf, epub, mobi, docx, txt |
| author | VARCHAR(255) | Yes | NULL | Author name (for books) |
| publisher | VARCHAR(255) | Yes | NULL | Publisher name |
| publication_date | DATE | Yes | NULL | Publication date |
| category_id | UUID | Yes | NULL | Foreign key to categories |
| language | VARCHAR(10) | Yes | 'en' | Content language code |
| cover_image_url | VARCHAR(500) | Yes | NULL | Cover/thumbnail image |
| file_url | VARCHAR(500) | Yes | NULL | Main content file URL |
| file_size_bytes | BIGINT | Yes | NULL | File size in bytes |
| page_count | INTEGER | Yes | NULL | Number of pages |
| **E-COMMERCE FIELDS** |
| price | DECIMAL(10,2) | Yes | 0.00 | Sale price |
| is_free | BOOLEAN | Yes | FALSE | Free content flag |
| is_for_sale | BOOLEAN | Yes | FALSE | Available for purchase |
| stock_quantity | INTEGER | Yes | 0 | Inventory count |
| isbn | VARCHAR(20) | Yes | NULL | ISBN number (unique) |
| **DISCOVERY FIELDS** |
| is_featured | BOOLEAN | Yes | FALSE | Featured on homepage |
| is_bestseller | BOOLEAN | Yes | FALSE | Bestseller badge |
| is_new_arrival | BOOLEAN | Yes | FALSE | New arrival badge |
| average_rating | DECIMAL(3,2) | Yes | 0.00 | Average user rating (0-5) |
| total_reviews | INTEGER | Yes | 0 | Total review count |
| total_downloads | INTEGER | Yes | 0 | Total download count |
| view_count | INTEGER | Yes | 0 | Total view count |
| **ACCESS CONTROL** |
| visibility | VARCHAR(20) | Yes | 'public' | Visibility: public, private, organization, restricted |
| access_level | VARCHAR(20) | Yes | 'free' | Access: free, paid, subscription, organization_only |
| **CORPORATE FIELDS** |
| document_number | VARCHAR(100) | Yes | NULL | Corporate document ID |
| version | VARCHAR(20) | Yes | '1.0' | Document version |
| department | VARCHAR(100) | Yes | NULL | Owning department |
| confidentiality | VARCHAR(50) | Yes | NULL | Confidentiality: public, internal, confidential, restricted |
| **STATUS & OWNERSHIP** |
| status | VARCHAR(20) | Yes | 'draft' | Status: draft, pending_review, published, archived, discontinued |
| uploaded_by | UUID | Yes | NULL | Foreign key to profiles |
| organization_id | UUID | Yes | NULL | Foreign key to organizations |
| **SEO** |
| meta_keywords | TEXT[] | Yes | NULL | Keywords array |
| search_vector | tsvector | Yes | NULL | Full-text search vector |
| **TIMESTAMPS** |
| created_at | TIMESTAMPTZ | Yes | NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | Yes | NOW() | Last update timestamp |
| published_at | TIMESTAMPTZ | Yes | NULL | Publication timestamp |

**Constraints:**
- CHECK: content_type IN ('book', 'ebook', 'document', 'paper', 'report', 'manual', 'guide')
- CHECK: format IN ('pdf', 'epub', 'mobi', 'docx', 'txt')
- CHECK: visibility IN ('public', 'private', 'organization', 'restricted')
- CHECK: access_level IN ('free', 'paid', 'subscription', 'organization_only')
- CHECK: confidentiality IN ('public', 'internal', 'confidential', 'restricted')
- CHECK: status IN ('draft', 'pending_review', 'published', 'archived', 'discontinued')
- UNIQUE: isbn
- Foreign Keys: category_id → categories(id), uploaded_by → profiles(id), organization_id → organizations(id)

**Indexes:**
- idx_content_type ON content_type
- idx_content_status ON status
- idx_content_visibility ON visibility
- idx_content_category ON category_id
- idx_content_uploader ON uploaded_by
- idx_content_organization ON organization_id
- idx_content_is_for_sale ON is_for_sale
- idx_content_featured ON is_featured WHERE is_featured = TRUE
- idx_content_bestseller ON is_bestseller WHERE is_bestseller = TRUE
- idx_content_published ON published_at WHERE status = 'published'
- idx_content_search ON search_vector (GIN index)
- idx_content_title_trgm ON title (GIN with trigram for fuzzy search)

---

### 7. content_tags
Many-to-many relationship between content and tags.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| content_id | UUID | No | - | Foreign key to content |
| tag_id | UUID | No | - | Foreign key to tags |

**Constraints:**
- PRIMARY KEY: (content_id, tag_id)
- Foreign Keys: content_id → content(id), tag_id → tags(id)

---

### 8. content_files
Manages multiple files per content (supplements, versions, formats).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | No | uuid_generate_v4() | Primary key |
| content_id | UUID | No | - | Foreign key to content |
| file_name | VARCHAR(255) | No | - | Original file name |
| file_url | VARCHAR(500) | No | - | File URL/path |
| file_type | VARCHAR(50) | Yes | NULL | File type category |
| file_size_bytes | BIGINT | Yes | NULL | File size |
| mime_type | VARCHAR(100) | Yes | NULL | MIME type |
| storage_path | VARCHAR(500) | Yes | NULL | Storage path in Supabase |
| version | VARCHAR(20) | Yes | '1.0' | File version |
| is_primary | BOOLEAN | Yes | FALSE | Primary file flag |
| uploaded_by | UUID | Yes | NULL | Foreign key to profiles |
| uploaded_at | TIMESTAMPTZ | Yes | NOW() | Upload timestamp |

**Constraints:**
- Foreign Keys: content_id → content(id), uploaded_by → profiles(id)

---

### 9. version_history
Tracks content changes over time.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | No | uuid_generate_v4() | Primary key |
| content_id | UUID | No | - | Foreign key to content |
| version_number | VARCHAR(20) | No | - | Version identifier |
| changes | TEXT | Yes | NULL | Change description |
| file_url | VARCHAR(500) | Yes | NULL | Version file URL |
| modified_by | UUID | Yes | NULL | Foreign key to profiles |
| created_at | TIMESTAMPTZ | Yes | NOW() | Version creation timestamp |

**Constraints:**
- Foreign Keys: content_id → content(id), modified_by → profiles(id)

---

### 10. carts
Shopping cart for each user.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | No | uuid_generate_v4() | Primary key |
| user_id | UUID | No | - | Foreign key to profiles |
| created_at | TIMESTAMPTZ | Yes | NOW() | Cart creation timestamp |
| updated_at | TIMESTAMPTZ | Yes | NOW() | Last update timestamp |

**Constraints:**
- UNIQUE: user_id (one cart per user)
- Foreign Key: user_id → profiles(id)

**Indexes:**
- Unique index on user_id

---

### 11. cart_items
Items in shopping carts.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | No | uuid_generate_v4() | Primary key |
| cart_id | UUID | No | - | Foreign key to carts |
| content_id | UUID | No | - | Foreign key to content |
| quantity | INTEGER | Yes | 1 | Item quantity |
| price | DECIMAL(10,2) | No | - | Price at time of adding |
| added_at | TIMESTAMPTZ | Yes | NOW() | Item add timestamp |

**Constraints:**
- CHECK: quantity > 0
- UNIQUE: (cart_id, content_id) - one item per content per cart
- Foreign Keys: cart_id → carts(id), content_id → content(id)

**Indexes:**
- idx_cart_items_cart ON cart_id

---

### 12. orders
Purchase orders from users.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | No | uuid_generate_v4() | Primary key |
| order_number | VARCHAR(50) | No | - | Unique order number |
| user_id | UUID | Yes | NULL | Foreign key to profiles |
| **PRICING** |
| subtotal | DECIMAL(10,2) | No | - | Items subtotal |
| tax | DECIMAL(10,2) | Yes | 0.00 | Tax amount |
| shipping | DECIMAL(10,2) | Yes | 0.00 | Shipping cost |
| discount | DECIMAL(10,2) | Yes | 0.00 | Discount amount |
| total_price | DECIMAL(10,2) | No | - | Final total |
| **STATUS** |
| status | VARCHAR(50) | Yes | 'pending' | Order status: pending, processing, completed, cancelled, refunded |
| payment_status | VARCHAR(50) | Yes | 'pending' | Payment status: pending, paid, failed, refunded |
| **ADDRESSES** |
| shipping_address | TEXT | Yes | NULL | Delivery address |
| billing_address | TEXT | Yes | NULL | Billing address |
| **PAYMENT** |
| payment_method | VARCHAR(50) | Yes | NULL | Payment method used |
| payment_reference | VARCHAR(255) | Yes | NULL | Payment gateway reference |
| **TIMESTAMPS** |
| created_at | TIMESTAMPTZ | Yes | NOW() | Order creation |
| updated_at | TIMESTAMPTZ | Yes | NOW() | Last update |
| completed_at | TIMESTAMPTZ | Yes | NULL | Completion timestamp |

**Constraints:**
- UNIQUE: order_number
- CHECK: status IN ('pending', 'processing', 'completed', 'cancelled', 'refunded')
- CHECK: payment_status IN ('pending', 'paid', 'failed', 'refunded')
- Foreign Key: user_id → profiles(id)

**Indexes:**
- idx_orders_user ON user_id
- idx_orders_status ON status
- idx_orders_created ON created_at DESC

---

### 13. order_items
Items within orders.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | No | uuid_generate_v4() | Primary key |
| order_id | UUID | No | - | Foreign key to orders |
| content_id | UUID | Yes | NULL | Foreign key to content |
| quantity | INTEGER | No | - | Item quantity |
| price | DECIMAL(10,2) | No | - | Price at purchase time |
| title | VARCHAR(500) | Yes | NULL | Content title snapshot |
| created_at | TIMESTAMPTZ | Yes | NOW() | Item creation timestamp |

**Constraints:**
- CHECK: quantity > 0
- Foreign Keys: order_id → orders(id), content_id → content(id)

---

### 14. collections
User-created or organizational collections.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | No | uuid_generate_v4() | Primary key |
| name | VARCHAR(255) | No | - | Collection name |
| description | TEXT | Yes | NULL | Collection description |
| user_id | UUID | Yes | NULL | Foreign key to profiles (personal) |
| organization_id | UUID | Yes | NULL | Foreign key to organizations (organizational) |
| visibility | VARCHAR(20) | Yes | 'private' | Visibility: private, public, organization |
| is_default | BOOLEAN | Yes | FALSE | Default collection flag |
| created_at | TIMESTAMPTZ | Yes | NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | Yes | NOW() | Last update timestamp |

**Constraints:**
- CHECK: visibility IN ('private', 'public', 'organization')
- Foreign Keys: user_id → profiles(id), organization_id → organizations(id)

**Indexes:**
- idx_collections_user ON user_id
- idx_collections_org ON organization_id

---

### 15. collection_items
Content items within collections.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | No | uuid_generate_v4() | Primary key |
| collection_id | UUID | No | - | Foreign key to collections |
| content_id | UUID | No | - | Foreign key to content |
| added_at | TIMESTAMPTZ | Yes | NOW() | Addition timestamp |
| notes | TEXT | Yes | NULL | User notes about item |

**Constraints:**
- UNIQUE: (collection_id, content_id)
- Foreign Keys: collection_id → collections(id), content_id → content(id)

**Indexes:**
- idx_collection_items_collection ON collection_id
- idx_collection_items_content ON content_id

---

### 16. reading_progress
Tracks user reading progress per content.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | No | uuid_generate_v4() | Primary key |
| user_id | UUID | No | - | Foreign key to profiles |
| content_id | UUID | No | - | Foreign key to content |
| current_page | INTEGER | Yes | 0 | Current page number |
| total_pages | INTEGER | Yes | NULL | Total pages in content |
| percentage | DECIMAL(5,2) | Yes | 0.00 | Completion percentage |
| last_read_at | TIMESTAMPTZ | Yes | NOW() | Last reading timestamp |
| completed | BOOLEAN | Yes | FALSE | Completion flag |

**Constraints:**
- UNIQUE: (user_id, content_id)
- Foreign Keys: user_id → profiles(id), content_id → content(id)

**Indexes:**
- idx_reading_user_content ON (user_id, content_id)

---

### 17. bookmarks
User bookmarks within content.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | No | uuid_generate_v4() | Primary key |
| user_id | UUID | No | - | Foreign key to profiles |
| content_id | UUID | No | - | Foreign key to content |
| page_number | INTEGER | Yes | NULL | Bookmarked page |
| note | TEXT | Yes | NULL | Bookmark note |
| created_at | TIMESTAMPTZ | Yes | NOW() | Creation timestamp |

**Constraints:**
- Foreign Keys: user_id → profiles(id), content_id → content(id)

**Indexes:**
- idx_bookmarks_user ON user_id

---

### 18. annotations
User highlights and notes within content.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | No | uuid_generate_v4() | Primary key |
| user_id | UUID | No | - | Foreign key to profiles |
| content_id | UUID | No | - | Foreign key to content |
| page_number | INTEGER | Yes | NULL | Annotation page |
| highlighted_text | TEXT | Yes | NULL | Highlighted text |
| note | TEXT | Yes | NULL | User annotation note |
| color | VARCHAR(20) | Yes | 'yellow' | Highlight color |
| created_at | TIMESTAMPTZ | Yes | NOW() | Creation timestamp |

**Constraints:**
- Foreign Keys: user_id → profiles(id), content_id → content(id)

**Indexes:**
- idx_annotations_user_content ON (user_id, content_id)

---

### 19. reviews
User reviews and ratings for content.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | No | uuid_generate_v4() | Primary key |
| content_id | UUID | No | - | Foreign key to content |
| user_id | UUID | No | - | Foreign key to profiles |
| rating | INTEGER | No | - | Rating (1-5 stars) |
| title | VARCHAR(255) | Yes | NULL | Review title |
| review_text | TEXT | Yes | NULL | Review body |
| is_verified_purchase | BOOLEAN | Yes | FALSE | Verified purchase flag |
| helpful_count | INTEGER | Yes | 0 | Helpful vote count |
| created_at | TIMESTAMPTZ | Yes | NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | Yes | NOW() | Last update timestamp |

**Constraints:**
- CHECK: rating >= 1 AND rating <= 5
- UNIQUE: (content_id, user_id) - one review per user per content
- Foreign Keys: content_id → content(id), user_id → profiles(id)

**Indexes:**
- idx_reviews_content ON content_id
- idx_reviews_user ON user_id

---

### 20. publishing_requests
Author manuscript submission requests.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | No | uuid_generate_v4() | Primary key |
| user_id | UUID | No | - | Foreign key to profiles |
| title | VARCHAR(500) | No | - | Manuscript title |
| description | TEXT | Yes | NULL | Manuscript description |
| genre | VARCHAR(100) | Yes | NULL | Genre/category |
| manuscript_url | VARCHAR(500) | Yes | NULL | Manuscript file URL |
| sample_chapters_url | VARCHAR(500) | Yes | NULL | Sample chapters URL |
| author_name | VARCHAR(255) | Yes | NULL | Author name |
| author_bio | TEXT | Yes | NULL | Author biography |
| status | VARCHAR(50) | Yes | 'pending' | Status: pending, under_review, accepted, rejected, published |
| reviewer_notes | TEXT | Yes | NULL | Internal review notes |
| reviewed_by | UUID | Yes | NULL | Foreign key to profiles (reviewer) |
| submitted_at | TIMESTAMPTZ | Yes | NOW() | Submission timestamp |
| reviewed_at | TIMESTAMPTZ | Yes | NULL | Review timestamp |
| published_at | TIMESTAMPTZ | Yes | NULL | Publication timestamp |

**Constraints:**
- CHECK: status IN ('pending', 'under_review', 'accepted', 'rejected', 'published')
- Foreign Keys: user_id → profiles(id), reviewed_by → profiles(id)

---

### 21. banners
Promotional banners and hero sections.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | No | uuid_generate_v4() | Primary key |
| title | VARCHAR(255) | No | - | Banner title |
| subtitle | VARCHAR(255) | Yes | NULL | Banner subtitle |
| description | TEXT | Yes | NULL | Banner description |
| image_url | VARCHAR(500) | Yes | NULL | Banner image |
| link_url | VARCHAR(500) | Yes | NULL | Click-through URL |
| button_text | VARCHAR(100) | Yes | NULL | CTA button text |
| position | VARCHAR(50) | Yes | 'hero' | Position: hero, sidebar, footer, popup |
| is_active | BOOLEAN | Yes | TRUE | Active status |
| start_date | TIMESTAMPTZ | Yes | NULL | Start display date |
| end_date | TIMESTAMPTZ | Yes | NULL | End display date |
| sort_order | INTEGER | Yes | 0 | Display order |
| created_at | TIMESTAMPTZ | Yes | NOW() | Creation timestamp |

**Constraints:**
- CHECK: position IN ('hero', 'sidebar', 'footer', 'popup')

---

### 22. contact_messages
Contact form submissions and support tickets.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | No | uuid_generate_v4() | Primary key |
| user_id | UUID | Yes | NULL | Foreign key to profiles (optional) |
| name | VARCHAR(255) | Yes | NULL | Sender name |
| email | VARCHAR(255) | No | - | Sender email |
| subject | VARCHAR(255) | Yes | NULL | Message subject |
| message | TEXT | No | - | Message body |
| status | VARCHAR(50) | Yes | 'new' | Status: new, in_progress, resolved, closed |
| responded_at | TIMESTAMPTZ | Yes | NULL | Response timestamp |
| created_at | TIMESTAMPTZ | Yes | NOW() | Creation timestamp |

**Constraints:**
- CHECK: status IN ('new', 'in_progress', 'resolved', 'closed')
- Foreign Key: user_id → profiles(id)

---

### 23. download_history
Tracks content downloads for analytics.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | No | uuid_generate_v4() | Primary key |
| user_id | UUID | Yes | NULL | Foreign key to profiles |
| content_id | UUID | No | - | Foreign key to content |
| ip_address | INET | Yes | NULL | Downloader IP address |
| user_agent | TEXT | Yes | NULL | Browser/client info |
| downloaded_at | TIMESTAMPTZ | Yes | NOW() | Download timestamp |

**Constraints:**
- Foreign Keys: user_id → profiles(id), content_id → content(id)

**Indexes:**
- idx_downloads_content ON content_id
- idx_downloads_user ON user_id
- idx_downloads_date ON downloaded_at

---

### 24. search_logs
Logs user searches for analytics and improvement.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | No | uuid_generate_v4() | Primary key |
| user_id | UUID | Yes | NULL | Foreign key to profiles |
| search_query | TEXT | No | - | Search query text |
| results_count | INTEGER | Yes | NULL | Number of results |
| filters | JSONB | Yes | NULL | Applied filters (JSON) |
| created_at | TIMESTAMPTZ | Yes | NOW() | Search timestamp |

**Constraints:**
- Foreign Key: user_id → profiles(id)

---

## Table Relationships

### User-Content Relationships
```sql
profiles (1) ──── (N) content [uploaded_by]
profiles (1) ──── (N) collections [user_id]
profiles (1) ──── (1) carts [user_id]
profiles (1) ──── (N) orders [user_id]
profiles (1) ──── (N) reading_progress [user_id]
profiles (1) ──── (N) reviews [user_id]
```

### Organization Relationships
```sql
organizations (1) ──── (N) organization_members [organization_id]
organizations (1) ──── (N) content [organization_id]
organizations (1) ──── (N) collections [organization_id]
```

### Content Relationships
```sql
content (1) ──── (N) content_tags [content_id]
content (1) ──── (N) content_files [content_id]
content (1) ──── (N) version_history [content_id]
content (1) ──── (N) cart_items [content_id]
content (1) ──── (N) order_items [content_id]
content (1) ──── (N) collection_items [content_id]
content (1) ──── (N) reviews [content_id]
content (N) ──── (1) categories [category_id]
```

### E-Commerce Flow
```sql
carts (1) ──── (N) cart_items
orders (1) ──── (N) order_items
profiles → carts → cart_items → content
profiles → orders → order_items → content
```

---

## Row Level Security (RLS) Policies

### profiles
```sql
-- Everyone can view public profiles
CREATE POLICY "Public profiles viewable"
  ON profiles FOR SELECT
  USING (true);

-- Users can update own profile only
CREATE POLICY "Users update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);
```

### organizations
```sql
-- Members can view their organization
CREATE POLICY "Members view organization"
  ON organizations FOR SELECT
  USING (
    id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );
```

### content
```sql
-- Public content viewable by everyone
CREATE POLICY "Public content viewable"
  ON content FOR SELECT
  USING (
    visibility = 'public' OR
    (visibility = 'organization' AND organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
    )) OR
    uploaded_by = auth.uid()
  );

-- Users can insert their own content
CREATE POLICY "Users insert own content"
  ON content FOR INSERT
  WITH CHECK (auth.uid() = uploaded_by);

-- Users can update their own content
CREATE POLICY "Users update own content"
  ON content FOR UPDATE
  USING (auth.uid() = uploaded_by);
```

### orders
```sql
-- Users can only view their own orders
CREATE POLICY "Users view own orders"
  ON orders FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own orders
CREATE POLICY "Users create own orders"
  ON orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

### collections
```sql
-- Users view own collections + public collections
CREATE POLICY "View collections"
  ON collections FOR SELECT
  USING (
    auth.uid() = user_id OR 
    visibility = 'public'
  );

-- Users manage own collections
CREATE POLICY "Manage own collections"
  ON collections FOR ALL
  USING (auth.uid() = user_id);
```

### reading_progress, bookmarks, annotations
```sql
-- Users can only access their own data
CREATE POLICY "Own reading data"
  ON [table_name] FOR ALL
  USING (auth.uid() = user_id);
```

---

## Indexes & Performance

### Critical Indexes

**Full-Text Search:**
```sql
-- GIN index for tsvector search
CREATE INDEX idx_content_search 
  ON content USING GIN(search_vector);

-- Trigram index for fuzzy search
CREATE INDEX idx_content_title_trgm 
  ON content USING GIN(title gin_trgm_ops);
```

**E-Commerce Performance:**
```sql
-- Fast order lookups
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);

-- Cart optimization
CREATE INDEX idx_cart_items_cart ON cart_items(cart_id);
```

**Content Discovery:**
```sql
-- Partial indexes for featured content (smaller, faster)
CREATE INDEX idx_content_featured 
  ON content(is_featured) 
  WHERE is_featured = TRUE;

CREATE INDEX idx_content_bestseller 
  ON content(is_bestseller) 
  WHERE is_bestseller = TRUE;

-- Published content only
CREATE INDEX idx_content_published 
  ON content(published_at) 
  WHERE status = 'published';
```

**Multi-Column Indexes:**
```sql
-- Reading progress lookup
CREATE INDEX idx_reading_user_content 
  ON reading_progress(user_id, content_id);

-- Annotations lookup
CREATE INDEX idx_annotations_user_content 
  ON annotations(user_id, content_id);
```

---

## Triggers & Functions

### 1. Auto-Update Timestamps
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$ LANGUAGE plpgsql;

-- Applied to tables:
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
-- (Similar triggers on: organizations, content, carts, orders, collections, reviews)
```

### 2. Full-Text Search Vector Update
```sql
CREATE OR REPLACE FUNCTION update_content_search_vector()
RETURNS TRIGGER AS $
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.author, '')), 'C');
    RETURN NEW;
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER update_content_search
    BEFORE INSERT OR UPDATE ON content
    FOR EACH ROW EXECUTE FUNCTION update_content_search_vector();
```

### 3. Auto-Update Content Ratings
```sql
CREATE OR REPLACE FUNCTION update_content_rating()
RETURNS TRIGGER AS $
BEGIN
    UPDATE content SET
        average_rating = (
            SELECT AVG(rating) 
            FROM reviews 
            WHERE content_id = COALESCE(NEW.content_id, OLD.content_id)
        ),
        total_reviews = (
            SELECT COUNT(*) 
            FROM reviews 
            WHERE content_id = COALESCE(NEW.content_id, OLD.content_id)
        )
    WHERE id = COALESCE(NEW.content_id, OLD.content_id);
    RETURN COALESCE(NEW, OLD);
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER update_rating_on_review
    AFTER INSERT OR UPDATE OR DELETE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_content_rating();
```

---

## Views

### v_published_books
All published books with complete information.

```sql
CREATE VIEW v_published_books AS
SELECT 
    c.id,
    c.title,
    c.author,
    c.description,
    c.price,
    c.cover_image_url,
    c.average_rating,
    c.total_reviews,
    c.is_bestseller,
    c.is_featured,
    cat.name as category_name,
    c.published_at
FROM content c
LEFT JOIN categories cat ON c.category_id = cat.id
WHERE c.status = 'published' 
  AND c.is_for_sale = TRUE
  AND c.visibility = 'public'
ORDER BY c.published_at DESC;
```

### v_bestsellers
Top-selling books.

```sql
CREATE VIEW v_bestsellers AS
SELECT 
    c.*,
    COUNT(oi.id) as total_sales
FROM content c
JOIN order_items oi ON c.id = oi.content_id
WHERE c.is_bestseller = TRUE
GROUP BY c.id
ORDER BY total_sales DESC
LIMIT 20;
```

### v_user_library
Complete user library (purchased + collected).

```sql
CREATE VIEW v_user_library AS
SELECT DISTINCT
    c.*,
    'purchased' as source
FROM content c
JOIN order_items oi ON c.id = oi.content_id
JOIN orders o ON oi.order_id = o.id
WHERE o.user_id = auth.uid()
  AND o.payment_status = 'paid'
UNION
SELECT DISTINCT
    c.*,
    'collected' as source
FROM content c
JOIN collection_items ci ON c.id = ci.content_id
JOIN collections col ON ci.collection_id = col.id
WHERE col.user_id = auth.uid();
```

---

## Migration Guide

### Running Migrations

**1. Initial Setup**
```bash
# Enable extensions
psql -d your_database -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"
psql -d your_database -c "CREATE EXTENSION IF NOT EXISTS \"pg_trgm\";"
```

**2. Run Migrations in Order**
```bash
# Core tables first
psql -d your_database -f migrations/001_create_profiles.sql
psql -d your_database -f migrations/002_create_organizations.sql
psql -d your_database -f migrations/003_create_organization_members.sql

# Content system
psql -d your_database -f migrations/004_create_categories.sql
psql -d your_database -f migrations/005_create_tags.sql
psql -d your_database -f migrations/007_create_content.sql

# ... continue with remaining migrations
```

**3. Apply Triggers & Functions**
```bash
psql -d your_database -f migrations/025_database_functions.sql
psql -d your_database -f migrations/026_search_functions.sql
```

**4. Seed Initial Data**
```bash
psql -d your_database -f migrations/998_seed_data_dev.sql
```

### Rollback Strategy
Each migration should have a corresponding rollback file:
```sql
-- migrations/001_create_profiles.sql
-- rollback/001_drop_profiles.sql
DROP TABLE IF EXISTS profiles CASCADE;
```

---

## Query Examples

### 1. Search for Books
```sql
-- Full-text search
SELECT * FROM content
WHERE search_vector @@ to_tsquery('english', 'programming & python')
  AND status = 'published'
ORDER BY ts_rank(search_vector, to_tsquery('english', 'programming & python')) DESC
LIMIT 20;

-- Fuzzy search (typo-tolerant)
SELECT * FROM content
WHERE title % 'programing' -- Note: misspelled
  OR similarity(title, 'programing') > 0.3
ORDER BY similarity(title, 'programing') DESC;
```

### 2. Get User's Cart with Items
```sql
SELECT 
    c.id as cart_id,
    ci.id as item_id,
    content.title,
    content.price,
    ci.quantity,
    (content.price * ci.quantity) as subtotal
FROM carts c
JOIN cart_items ci ON c.id = ci.cart_id
JOIN content ON ci.content_id = content.id
WHERE c.user_id = 'user-uuid-here';
```

### 3. Get Bestsellers with Categories
```sql
SELECT 
    c.title,
    c.author,
    c.price,
    c.average_rating,
    cat.name as category,
    COUNT(oi.id) as sales_count
FROM content c
LEFT JOIN categories cat ON c.category_id = cat.id
LEFT JOIN order_items oi ON c.id = oi.content_id
WHERE c.is_for_sale = TRUE 
  AND c.status = 'published'
GROUP BY c.id, cat.name
ORDER BY sales_count DESC
LIMIT 10;
```

### 4. Get Organization Documents
```sql
SELECT 
    c.*,
    p.full_name as uploaded_by_name
FROM content c
JOIN profiles p ON c.uploaded_by = p.id
WHERE c.organization_id = 'org-uuid-here'
  AND c.content_type IN ('document', 'report', 'manual')
  AND c.visibility = 'organization'
ORDER BY c.created_at DESC;
```

### 5. User Reading Progress
```sql
SELECT 
    c.title,
    c.cover_image_url,
    rp.percentage,
    rp.last_read_at,
    rp.completed
FROM reading_progress rp
JOIN content c ON rp.content_id = c.id
WHERE rp.user_id = 'user-uuid-here'
ORDER BY rp.last_read_at DESC;
```

### 6. Content with All Tags
```sql
SELECT 
    c.id,
    c.title,
    ARRAY_AGG(t.name) as tags
FROM content c
LEFT JOIN content_tags ct ON c.id = ct.content_id
LEFT JOIN tags t ON ct.tag_id = t.id
WHERE c.status = 'published'
GROUP BY c.id, c.title;
```

### 7. Popular Content (Most Downloaded)
```sql
SELECT 
    c.title,
    c.author,
    c.content_type,
    COUNT(dh.id) as download_count
FROM content c
JOIN download_history dh ON c.id = dh.content_id
WHERE dh.downloaded_at >= NOW() - INTERVAL '30 days'
GROUP BY c.id
ORDER BY download_count DESC
LIMIT 20;
```

---

## Best Practices

### 1. Always Use Transactions
```sql
BEGIN;
    INSERT INTO content (...) VALUES (...);
    INSERT INTO content_tags (...) VALUES (...);
COMMIT;
```

### 2. Use Prepared Statements
```javascript
// Prevents SQL injection
const { data } = await supabase
  .from('content')
  .select('*')
  .eq('id', contentId); // Parameterized
```

### 3. Leverage RLS for Security
```javascript
// No need to manually filter by user_id
// RLS policies handle this automatically
const { data } = await supabase
  .from('orders')
  .select('*'); // Only returns current user's orders
```

### 4. Use Indexes for WHERE Clauses
```sql
-- Bad: No index on status
SELECT * FROM content WHERE status = 'published';

-- Good: Index exists
-- CREATE INDEX idx_content_status ON content(status);
```

### 5. Batch Operations
```javascript
// Bad: Multiple individual inserts
for (let item of items) {
  await supabase.from('cart_items').insert(item);
}

// Good: Single batch insert
await supabase.from('cart_items').insert(items);
```

### 6. Clean Up Old Data
```sql
-- Archive old orders (older than 2 years)
UPDATE orders 
SET status = 'archived' 
WHERE created_at < NOW() - INTERVAL '2 years';

-- Delete old search logs
DELETE FROM search_logs 
WHERE created_at < NOW() - INTERVAL '90 days';
```

### 7. Monitor Query Performance
```sql
-- Enable pg_stat_statements
CREATE EXTENSION pg_stat_statements;

-- Find slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

---

## Backup & Maintenance

### Daily Backups
```bash
# Full backup
pg_dump -Fc your_database > backup_$(date +%Y%m%d).dump

# Restore
pg_restore -d your_database backup_20260122.dump
```

### Regular Maintenance
```sql
-- Vacuum and analyze
VACUUM ANALYZE content;
VACUUM ANALYZE orders;

-- Reindex if needed
REINDEX TABLE content;
```

### Monitoring Checklist
- [ ] Database size growth
- [ ] Query performance (slow queries)
- [ ] Index usage statistics
- [ ] Connection pool usage
- [ ] Disk space
- [ ] Backup success/failure

---

## Support & Troubleshooting

### Common Issues

**1. Slow Search Queries**
- Ensure search_vector is updated
- Check GIN index exists
- Consider limiting result set

**2. RLS Policy Conflicts**
- Check auth.uid() returns valid UUID
- Verify user is authenticated
- Review policy logic

**3. Foreign Key Violations**
- Ensure referenced records exist
- Check ON DELETE actions
- Use transactions for related inserts

**4. Duplicate Key Errors**
- Check UNIQUE constraints
- Handle conflicts with ON CONFLICT clause
- Validate data before insertion

---

## Changelog

### Version 1.0.0 (2026-01-22)
- Initial database schema
- Core tables for users, content, e-commerce
- RLS policies implemented
- Full-text search enabled
- Triggers and functions added

---

## Contact & Contributions

For questions or improvements, please:
- Open an issue on GitHub
- Submit a pull request
- Contact the database team

**Last Updated**: January 22, 2026
**Schema Version**: 1.0.0