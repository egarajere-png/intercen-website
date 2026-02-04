import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import publishersTeam from '@/assets/publishers-team.jpg';

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
              Publishing Excellence Since 2019
            </p>

            <h1 className="headline-1 mb-6">
              Your Partner in
              <span className="block text-primary">Publishing Success</span>
            </h1>

            <p className="body-2 text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-8">
              Intercen Books is a leading publisher and book marketplace in East Africa. 
              We help authors bring their stories to life and connect readers with 
              exceptional literature.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-12">
              <Link to="/books">
                <Button variant="hero" size="xl" className="gap-2 w-full sm:w-auto hover-shine">
                  Browse Books
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link to="/publish">
                <Button variant="hero-outline" size="xl" className="w-full sm:w-auto">
                  Publish With Us
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
                  <p className="label-1 font-semibold">Fast Delivery</p>
                  <p className="label-2 text-muted-foreground">Across East Africa</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="label-1 font-semibold">500+ Titles</p>
                  <p className="label-2 text-muted-foreground">Quality Publications</p>
                </div>
              </div>
            </div>
          </div>

          {/* Hero Image - Publishers Team */}
          <div className="relative hidden lg:block">
            <div className="relative z-10">
              {/* Main Image Container */}
              <div className="relative w-full max-w-lg mx-auto">
                {/* Decorative background elements */}
                <div className="absolute -left-6 -top-6 w-full h-full bg-primary/20 rounded-2xl transform -rotate-3" />
                <div className="absolute -right-6 -bottom-6 w-full h-full bg-secondary/20 rounded-2xl transform rotate-3" />
                
                {/* Main Image */}
                <div className="relative bg-card rounded-2xl shadow-elevated overflow-hidden transform hover:scale-[1.02] transition-transform duration-500">
                  <img
                    src={publishersTeam}
                    alt="Intercen Books Publishing Team"
                    className="w-full h-auto object-cover aspect-[4/5]"
                  />
                  
                  {/* Overlay with text */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6">
                    <h3 className="font-forum text-xl text-white mb-1">Our Publishing Team</h3>
                    <p className="text-white/80 text-sm">Dedicated to bringing African stories to the world</p>
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
