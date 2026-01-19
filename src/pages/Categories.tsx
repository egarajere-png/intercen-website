import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { categories } from '@/data/mockBooks';

const categoryImages: Record<string, string> = {
  fiction: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&h=400&fit=crop",
  "non-fiction": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=400&fit=crop",
  "mystery-thriller": "https://images.unsplash.com/photo-1509021436665-8f07dbf5bf1d?w=600&h=400&fit=crop",
  romance: "https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=600&h=400&fit=crop",
  "science-fiction": "https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?w=600&h=400&fit=crop",
  biography: "https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=600&h=400&fit=crop",
  "self-help": "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=600&h=400&fit=crop",
  childrens: "https://images.unsplash.com/photo-1629992101753-56d196c8aabb?w=600&h=400&fit=crop",
};

const categoryDescriptions: Record<string, string> = {
  fiction: "Immerse yourself in captivating stories, imaginative worlds, and unforgettable characters.",
  "non-fiction": "Explore real stories, insights, and knowledge from experts across various fields.",
  "mystery-thriller": "Edge-of-your-seat suspense, gripping mysteries, and thrilling adventures await.",
  romance: "Fall in love with heartwarming stories of passion, connection, and happily-ever-afters.",
  "science-fiction": "Journey through space, time, and imagination with visionary tales of the future.",
  biography: "Discover inspiring life stories of remarkable people who shaped our world.",
  "self-help": "Transform your life with practical wisdom, strategies, and personal development guides.",
  childrens: "Spark imagination and nurture young minds with beloved children's stories.",
};

const Categories = () => {
  return (
    <Layout>
      {/* Page Header */}
      <div className="bg-muted/30 border-b">
        <div className="container py-8 md:py-12">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Link to="/" className="hover:text-primary">Home</Link>
            <ChevronDown className="h-4 w-4 rotate-[-90deg]" />
            <span className="text-foreground">Categories</span>
          </nav>
          <h1 className="font-serif text-3xl md:text-4xl font-bold mb-2">
            Browse by Category
          </h1>
          <p className="text-muted-foreground text-lg">
            Explore our curated collection across {categories.length} diverse genres
          </p>
        </div>
      </div>

      <div className="container py-8 md:py-12">
        <div className="grid md:grid-cols-2 gap-6">
          {categories.map((category, index) => (
            <Link
              key={category.id}
              to={`/books?category=${category.slug}`}
              className="group relative overflow-hidden rounded-2xl aspect-[16/9] animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Background Image */}
              <img
                src={categoryImages[category.slug] || categoryImages.fiction}
                alt={category.name}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              
              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/60 to-transparent" />
              
              {/* Content */}
              <div className="absolute inset-0 p-6 md:p-8 flex flex-col justify-end">
                <h2 className="font-serif text-2xl md:text-3xl font-bold text-white mb-2 group-hover:text-primary transition-colors">
                  {category.name}
                </h2>
                <p className="text-white/80 text-sm md:text-base mb-3 line-clamp-2">
                  {categoryDescriptions[category.slug] || "Discover amazing books in this category."}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-white/70 text-sm">
                    {category.bookCount} books
                  </span>
                  <span className="text-primary font-medium text-sm group-hover:translate-x-1 transition-transform">
                    Browse →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default Categories;
