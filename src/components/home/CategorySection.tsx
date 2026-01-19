import { Link } from 'react-router-dom';
import { categories } from '@/data/mockBooks';

const categoryImages: Record<string, string> = {
  fiction: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=300&fit=crop",
  "non-fiction": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop",
  "mystery-thriller": "https://images.unsplash.com/photo-1509021436665-8f07dbf5bf1d?w=400&h=300&fit=crop",
  romance: "https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=400&h=300&fit=crop",
  "science-fiction": "https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?w=400&h=300&fit=crop",
  biography: "https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=400&h=300&fit=crop",
  "self-help": "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=400&h=300&fit=crop",
  childrens: "https://images.unsplash.com/photo-1629992101753-56d196c8aabb?w=400&h=300&fit=crop",
};

export const CategorySection = () => {
  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="container">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="font-serif text-3xl md:text-4xl font-bold mb-3">
            Browse by Category
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Explore our curated collection across diverse genres
          </p>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {categories.map((category, index) => (
            <Link
              key={category.id}
              to={`/books?category=${category.slug}`}
              className="group relative overflow-hidden rounded-xl aspect-[4/3] animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Background Image */}
              <img
                src={categoryImages[category.slug] || categoryImages.fiction}
                alt={category.name}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              
              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal/90 via-charcoal/40 to-transparent" />
              
              {/* Content */}
              <div className="absolute inset-0 p-4 flex flex-col justify-end">
                <h3 className="font-serif text-lg md:text-xl font-bold text-white mb-1 group-hover:text-primary transition-colors">
                  {category.name}
                </h3>
                <p className="text-white/70 text-sm">
                  {category.bookCount} books
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};
