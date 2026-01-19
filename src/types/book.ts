export interface Book {
  id: string;
  title: string;
  author: string;
  publisher: string;
  publisherEmail?: string;
  price: number;
  originalPrice?: number;
  description: string;
  synopsis: string;
  category: string;
  coverImage: string;
  backCoverImage?: string;
  previewImages?: string[];
  stock: number;
  rating: number;
  reviewCount: number;
  isbn?: string;
  publicationDate?: string;
  pages?: number;
  language?: string;
  featured?: boolean;
  bestseller?: boolean;
}

export interface CartItem {
  book: Book;
  quantity: number;
}

export interface Order {
  id: string;
  userId: string;
  items: CartItem[];
  total: number;
  status: 'pending' | 'paid' | 'processing' | 'dispatched' | 'delivered';
  paymentStatus: 'pending' | 'paid' | 'failed';
  paymentMethod: 'mpesa' | 'card';
  deliveryAddress: DeliveryAddress;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryAddress {
  fullName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
}

export interface Publisher {
  id: string;
  name: string;
  email: string;
  description?: string;
  logo?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  bookCount?: number;
}
