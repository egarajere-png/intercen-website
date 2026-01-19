import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Star, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const HeroSection = () => {
  return (
    <section className="relative overflow-hidden bg-gradient-warm">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl float-animation" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
      </div>

      <div className="container relative py-16 md:py-24 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="text-center lg:text-left animate-slide-up">
            <p className="section-subtitle section-subtitle-left text-center lg:text-left">
              Over 10,000+ Books Available
            </p>

            <h1 className="headline-1 mb-6">
              Discover Your Next
              <span className="block text-primary">Great Read</span>
            </h1>

            <p className="body-2 text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-8">
              From bestsellers to hidden gems, find the perfect book for every mood. 
              Fast delivery across Kenya with secure payment options.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-12">
              <Link to="/books">
                <Button variant="hero" size="xl" className="gap-2 w-full sm:w-auto hover-shine">
                  Browse Collection
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link to="/about">
                <Button variant="hero-outline" size="xl" className="w-full sm:w-auto">
                  Learn More
                </Button>
              </Link>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap gap-6 justify-center lg:justify-start">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center">
                  <Truck className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="label-1 font-semibold">Free Delivery</p>
                  <p className="label-2 text-muted-foreground">On orders over KES 2,000</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="label-1 font-semibold">Quality Books</p>
                  <p className="label-2 text-muted-foreground">Authentic & verified</p>
                </div>
              </div>
            </div>
          </div>

          {/* Hero Image */}
          <div className="relative hidden lg:block">
            <div className="relative z-10">
              {/* Main Book Stack */}
              <div className="relative w-full max-w-md mx-auto">
                {/* Background Book */}
                <div className="absolute -left-8 top-8 w-48 h-72 bg-secondary/20 rounded-xl transform -rotate-12 shadow-elegant" />
                <div className="absolute -right-8 top-4 w-48 h-72 bg-primary/20 rounded-xl transform rotate-12 shadow-elegant" />
                
                {/* Main Featured Book */}
                <div className="relative bg-card rounded-2xl shadow-elevated p-6 transform hover:scale-105 transition-transform duration-500 hover-shine">
                  <div className="aspect-[3/4] rounded-xl overflow-hidden bg-muted mb-4">
                    <img
                      src="https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=600&fit=crop"
                      alt="Featured Book"
                      className="img-cover hero-scale"
                    />
                  </div>
                  <h3 className="font-forum font-normal text-xl mb-1">The Midnight Library</h3>
                  <p className="text-muted-foreground text-sm mb-2">Matt Haig</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold text-primary">$24.99</span>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-primary text-primary" />
                      <span className="text-sm font-medium">4.8</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Decorative Elements */}
            <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-primary/10 to-transparent rounded-full blur-2xl" />
          </div>
        </div>
      </div>
    </section>
  );
};
