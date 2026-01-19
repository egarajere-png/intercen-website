import { Link } from 'react-router-dom';
import { BookOpen, Facebook, Twitter, Instagram, Mail, Phone, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export const Footer = () => {
  return (
    <footer className="bg-charcoal text-white/90">
      {/* Newsletter Section */}
      <div className="border-b border-white/10">
        <div className="container py-12 md:py-16">
          <div className="max-w-2xl mx-auto text-center">
            <h3 className="title-1 text-secondary-foreground mb-3">
              Join Our Reading Community
            </h3>
            <p className="body-2 text-secondary-foreground/70 mb-6">
              Subscribe to get updates on new releases, exclusive offers, and reading recommendations.
            </p>
            <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <Input
                type="email"
                placeholder="Enter your email"
                className="h-12 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-primary"
              />
              <Button variant="gold" size="lg" className="shrink-0">
                Subscribe
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="container py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
                <BookOpen className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-forum text-xl">
                Book<span className="text-primary">Haven</span>
              </span>
            </Link>
            <p className="text-white/70 text-sm leading-relaxed mb-6">
              Your trusted destination for books that inspire, educate, and entertain. 
              Discover your next great read with us.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-white/60 hover:text-primary transition-colors">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="text-white/60 hover:text-primary transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-white/60 hover:text-primary transition-colors">
                <Instagram className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-forum text-lg mb-4">Quick Links</h4>
            <ul className="space-y-3">
              {['Home', 'Books', 'Categories', 'About Us', 'Contact'].map(link => (
                <li key={link}>
                  <Link 
                    to={`/${link.toLowerCase().replace(' ', '-')}`}
                    className="text-white/70 hover:text-primary transition-colors text-sm"
                  >
                    {link}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h4 className="font-forum text-lg mb-4">Categories</h4>
            <ul className="space-y-3">
              {['Fiction', 'Non-Fiction', 'Mystery & Thriller', 'Romance', 'Science Fiction', 'Children\'s Books'].map(cat => (
                <li key={cat}>
                  <Link 
                    to={`/books?category=${cat.toLowerCase()}`}
                    className="text-white/70 hover:text-primary transition-colors text-sm"
                  >
                    {cat}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-forum text-lg mb-4">Contact Us</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span className="text-white/70 text-sm">
                  123 Book Street, Library District<br />
                  Nairobi, Kenya
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-primary shrink-0" />
                <a href="tel:+254700000000" className="text-white/70 hover:text-primary text-sm">
                  +254 700 000 000
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-primary shrink-0" />
                <a href="mailto:hello@bookhaven.com" className="text-white/70 hover:text-primary text-sm">
                  hello@bookhaven.com
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="container py-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-white/50 text-sm">
            © 2024 BookHaven. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link to="/privacy" className="text-white/50 hover:text-white text-sm">
              Privacy Policy
            </Link>
            <Link to="/terms" className="text-white/50 hover:text-white text-sm">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
