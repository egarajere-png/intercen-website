import { Link } from 'react-router-dom';
import { ArrowRight, Percent } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const PromoBanner = () => {
  return (
    <section className="py-8 md:py-12">
      <div className="container">
        <div className="relative overflow-hidden rounded-2xl md:rounded-3xl bg-gradient-to-r from-secondary to-crimson-dark">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
          </div>

          <div className="relative px-6 py-10 md:px-12 md:py-16 lg:px-16 lg:py-20">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
              <div className="text-center lg:text-left">
                <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-2 mb-4">
                  <Percent className="h-4 w-4 text-white" />
                  <span className="text-sm font-medium text-white">Limited Time Offer</span>
                </div>
                <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
                  Up to 40% Off<br />
                  Selected Books
                </h2>
                <p className="text-white/80 text-lg max-w-md mb-6">
                  Don't miss out on our biggest sale of the year. 
                  Discover amazing deals on bestsellers and new releases.
                </p>
                <Link to="/books?sale=true">
                  <Button 
                    variant="gold" 
                    size="xl" 
                    className="gap-2"
                  >
                    Shop the Sale
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
              </div>

              {/* Decorative Books Stack */}
              <div className="hidden md:flex items-center gap-4">
                <div className="w-32 h-48 bg-white/10 rounded-lg transform -rotate-6 backdrop-blur-sm" />
                <div className="w-36 h-52 bg-white/20 rounded-lg transform rotate-3 backdrop-blur-sm shadow-lg" />
                <div className="w-32 h-48 bg-white/10 rounded-lg transform -rotate-3 backdrop-blur-sm" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
