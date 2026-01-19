import { Layout } from '@/components/layout/Layout';
import { BookOpen, Users, Award, Heart } from 'lucide-react';

const About = () => {
  const stats = [
    { label: 'Books Available', value: '10,000+' },
    { label: 'Happy Readers', value: '50,000+' },
    { label: 'Authors', value: '2,500+' },
    { label: 'Years of Service', value: '15+' },
  ];

  const values = [
    {
      icon: BookOpen,
      title: 'Quality Selection',
      description: 'We carefully curate our collection to bring you the best books across all genres.',
    },
    {
      icon: Users,
      title: 'Community First',
      description: 'Building a community of passionate readers who share their love for books.',
    },
    {
      icon: Award,
      title: 'Excellence',
      description: 'Committed to providing exceptional service and authentic books every time.',
    },
    {
      icon: Heart,
      title: 'Passion for Reading',
      description: 'We believe in the transformative power of books to inspire and educate.',
    },
  ];

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative bg-gradient-warm overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 right-20 w-96 h-96 bg-primary/30 rounded-full blur-3xl" />
          <div className="absolute bottom-10 left-10 w-64 h-64 bg-secondary/20 rounded-full blur-3xl" />
        </div>

        <div className="container relative py-16 md:py-24">
          <div className="max-w-3xl mx-auto text-center">
            <p className="section-subtitle">About Us</p>
            <h1 className="headline-1 mb-6">
              About <span className="text-primary">BookHaven</span>
            </h1>
            <p className="body-1 text-muted-foreground leading-relaxed">
              We're more than just a bookstore. We're a community of book lovers dedicated to 
              connecting readers with stories that inspire, educate, and transform lives.
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-charcoal text-white">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <p className="text-3xl md:text-4xl font-bold text-primary mb-2">
                  {stat.value}
                </p>
                <p className="text-white/70">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="font-serif text-3xl md:text-4xl font-bold mb-6">
                Our Story
              </h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  BookHaven was founded with a simple mission: to make quality books accessible 
                  to everyone in Kenya and beyond. What started as a small corner bookshop has 
                  grown into one of the region's most trusted online book destinations.
                </p>
                <p>
                  We partner directly with publishers and authors to bring you authentic books 
                  at fair prices. Our curated collection spans from international bestsellers 
                  to hidden African literary gems, ensuring there's something for every reader.
                </p>
                <p>
                  Today, we're proud to serve over 50,000 happy readers, delivering books to 
                  doorsteps across the country. But our mission remains the same: to foster a 
                  love of reading and make books accessible to all.
                </p>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-square rounded-2xl overflow-hidden bg-muted">
                <img
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=600&fit=crop"
                  alt="Bookstore interior"
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Decorative Element */}
              <div className="absolute -bottom-6 -right-6 w-48 h-48 bg-primary/10 rounded-2xl -z-10" />
            </div>
          </div>
        </div>
      </section>

      {/* Our Values */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4">
              Our Values
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              The principles that guide everything we do at BookHaven
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => (
              <div
                key={index}
                className="bg-card rounded-xl p-6 shadow-soft hover:shadow-card transition-shadow"
              >
                <div className="h-12 w-12 rounded-xl bg-accent flex items-center justify-center mb-4">
                  <value.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-serif font-bold text-lg mb-2">{value.title}</h3>
                <p className="text-muted-foreground text-sm">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="bg-primary rounded-2xl md:rounded-3xl p-8 md:p-12 text-center">
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
              Have Questions?
            </h2>
            <p className="text-primary-foreground/80 text-lg mb-8 max-w-2xl mx-auto">
              We'd love to hear from you. Reach out to our friendly team for any 
              inquiries about orders, partnerships, or just to chat about books!
            </p>
            <a href="mailto:hello@bookhaven.com">
              <button className="bg-charcoal text-white font-semibold px-8 py-3 rounded-lg hover:bg-charcoal/90 transition-colors">
                Contact Us
              </button>
            </a>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default About;
