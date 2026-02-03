import React, { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { 
  BookOpen, 
  Users, 
  Target, 
  Heart, 
  Globe, 
  Award,
  Lightbulb,
  Handshake,
  ArrowRight,
  Languages,
  FileText,
  Lock
} from 'lucide-react';

const stats = [
  { value: '15+', label: 'Years of Excellence' },
  { value: '500+', label: 'Books Published' },
  { value: '200+', label: 'Authors Partnered' },
  { value: '10M+', label: 'Readers Reached' },
];

const values = [
  {
    icon: Lightbulb,
    title: 'Innovation',
    description: 'Embracing new ideas and technologies to revolutionize African publishing.',
  },
  {
    icon: Heart,
    title: 'Passion',
    description: 'A deep love for literature drives everything we do.',
  },
  {
    icon: Handshake,
    title: 'Integrity',
    description: 'Honest, transparent relationships with authors, vendors, and readers.',
  },
  {
    icon: Globe,
    title: 'Impact',
    description: 'Creating meaningful change through the power of stories.',
  },
];

const team = [
  {
    name: 'Barack Wandera',
    role: 'Founder & CEO',
    // expected file: src/assets/team/barack-wandera.jpg
    image: new URL('../assets/barak.jpeg', import.meta.url).href,
  },
  {
    name: 'Miriam Achiso',
    role: 'Operations Manager',
    // expected file: src/assets/team/miriam-achiso.jpg
    image: new URL('../assets/team/miriam-achiso.jpg', import.meta.url).href,
  },
  {
    name: 'Chelangat Naomi',
    role: 'Editorial Director',
    // expected file: src/assets/team/chelangat-naomi.jpg
    image: new URL('../assets/chelangatnaomi.jpeg', import.meta.url).href,
  },
  {
    name: 'Robert Mutugi',
    role: 'Design Operations Lead',
    // expected file: src/assets/team/robert-mutugi.jpg
    image: new URL('../assets/team/robert-mutugi.jpg', import.meta.url).href,
  },
  {
    name: 'Betty Atiemo',
    role: 'Marketing Lead',
    // expected file: src/assets/team/betty-atiemo.jpg
    image: new URL('../assets/bettyatiemo.jpeg', import.meta.url).href,
  },
  {
    name: 'Jere Egara',
    role: 'Digital Publishing Systems Manager',
    // expected file: src/assets/team/jere-egara.jpg
    image: new URL('../assets/bahati.jpeg', import.meta.url).href,
  },
];

const translationDocuments = [
  "Books and manuscripts",
  "Educational and academic materials",
  "Contracts and legal documents",
  "Brochures and press releases",
  "Reference materials",
  "PowerPoint presentations",
  "Internal corporate communications",
  "User manuals and newsletters"
];

const About = () => {
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-hero py-16 md:py-24">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-10 right-20 w-80 h-80 bg-primary/30 rounded-full blur-3xl" />
          <div className="absolute bottom-20 left-10 w-64 h-64 bg-secondary/20 rounded-full blur-3xl" />
        </div>
        
        <div className="container relative">
          <div className="max-w-3xl mx-auto text-center">
            <p className="section-subtitle">Our Story</p>
            <h1 className="headline-1 mb-6">
              Championing African
              <span className="block text-primary">Literary Excellence</span>
            </h1>
            <p className="body-1 text-muted-foreground max-w-2xl mx-auto">
              InterCEN Books is more than a publishing house—we're a movement 
              dedicated to amplifying African voices and bringing world-class 
              literature to readers everywhere.
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-muted/30 border-y">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <p className="headline-2 text-primary mb-1">{stat.value}</p>
                <p className="label-1 text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="aspect-[4/3] rounded-2xl overflow-hidden mb-6 lg:mb-0">
                <img 
                  src="https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&h=600&fit=crop"
                  alt="InterCEN Books office"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            
            <div>
              <div className="mb-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Target className="h-6 w-6 text-primary" />
                  </div>
                  <h2 className="font-forum text-2xl">Our Mission</h2>
                </div>
                <p className="body-2 text-muted-foreground">
                  To discover, nurture, and publish exceptional literary works that 
                  reflect the richness of African culture and experience, while making 
                  quality books accessible to readers across the continent and beyond.
                </p>
              </div>
              
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-12 w-12 rounded-xl bg-secondary/10 flex items-center justify-center">
                    <Globe className="h-6 w-6 text-secondary" />
                  </div>
                  <h2 className="font-forum text-2xl">Our Vision</h2>
                </div>
                <p className="body-2 text-muted-foreground">
                  To be East Africa's leading publishing house and book marketplace, 
                  known for quality, innovation, and our commitment to fostering 
                  a vibrant reading culture across generations.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Publishing Philosophy */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <p className="section-subtitle">Philosophy</p>
            <h2 className="headline-2 mb-4">Our Publishing Philosophy</h2>
            <p className="body-2 text-muted-foreground">
              We believe that great books have the power to transform minds, 
              bridge cultures, and inspire change. Our publishing approach is 
              guided by these core principles.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <Card className="text-center p-6">
              <CardContent className="pt-6">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-forum text-xl mb-3">Quality First</h3>
                <p className="text-sm text-muted-foreground">
                  Every book we publish undergoes rigorous editorial review 
                  to ensure the highest standards of content and presentation.
                </p>
              </CardContent>
            </Card>
            
            <Card className="text-center p-6">
              <CardContent className="pt-6">
                <div className="h-16 w-16 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-secondary" />
                </div>
                <h3 className="font-forum text-xl mb-3">Author-Centric</h3>
                <p className="text-sm text-muted-foreground">
                  We value our authors as true partners, offering fair terms, 
                  transparent processes, and ongoing support throughout their journey.
                </p>
              </CardContent>
            </Card>
            
            <Card className="text-center p-6">
              <CardContent className="pt-6">
                <div className="h-16 w-16 rounded-full bg-accent/30 flex items-center justify-center mx-auto mb-4">
                  <Award className="h-8 w-8 text-accent-foreground" />
                </div>
                <h3 className="font-forum text-xl mb-3">Cultural Impact</h3>
                <p className="text-sm text-muted-foreground">
                  We prioritize stories that celebrate African heritage, 
                  challenge perspectives, and contribute to our literary landscape.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="text-center mb-12">
            <p className="section-subtitle">What Drives Us</p>
            <h2 className="headline-2 mb-4">Our Core Values</h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => (
              <div 
                key={index}
                className="group p-6 rounded-2xl bg-card border hover:shadow-elevated transition-all duration-300 hover:-translate-y-1"
              >
                <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary transition-colors">
                  <value.icon className="h-7 w-7 text-primary group-hover:text-primary-foreground transition-colors" />
                </div>
                <h3 className="font-forum text-xl mb-2">{value.title}</h3>
                <p className="text-sm text-muted-foreground">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Translation Services */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <p className="section-subtitle">Global Reach</p>
            <h2 className="headline-2 mb-4">Translation Services</h2>
            <p className="body-2 text-muted-foreground">
              At InterCEN Books, we collaborate with a global network of highly skilled native-language translators, 
              carefully selected based on their subject-matter expertise.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Translation Overview */}
            <div className="space-y-6">
              <div className="p-6 bg-card rounded-2xl border">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Languages className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-forum text-xl mb-2">Expert Translators</h3>
                    <p className="text-sm text-muted-foreground">
                      All our translators hold degrees in translation or linguistics and have a minimum of 
                      five years of professional experience. From general book translations to highly specialized 
                      academic, educational, and technical content in multiple languages.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-card rounded-2xl border">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
                    <Lock className="h-6 w-6 text-secondary" />
                  </div>
                  <div>
                    <h3 className="font-forum text-xl mb-2">Strict Confidentiality</h3>
                    <p className="text-sm text-muted-foreground">
                      InterCEN Books is fully committed to maintaining strict confidentiality for all manuscripts 
                      and documents entrusted to us. Our translators operate under binding confidentiality agreements, 
                      ensuring the protection of your intellectual property at every stage.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-card rounded-2xl border">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-accent/30 flex items-center justify-center shrink-0">
                    <Globe className="h-6 w-6 text-accent-foreground" />
                  </div>
                  <div>
                    <h3 className="font-forum text-xl mb-2">Website Translation & Localization</h3>
                    <p className="text-sm text-muted-foreground">
                      A website represents a publisher's global identity. We ensure websites are not only 
                      accurately translated but also culturally adapted to resonate with diverse audiences—
                      considering language, tone, reading habits, and cultural expectations.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Document Types */}
            <div className="p-8 bg-card rounded-2xl border">
              <div className="flex items-center gap-3 mb-6">
                <FileText className="h-6 w-6 text-primary" />
                <h3 className="font-forum text-xl">Document Translation</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                We translate a wide range of documents in any format, including:
              </p>
              <ul className="grid sm:grid-cols-2 gap-3">
                {translationDocuments.map((doc, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                    {doc}
                  </li>
                ))}
              </ul>
              <div className="mt-8 pt-6 border-t">
                <p className="text-sm text-muted-foreground mb-4">
                  We guarantee exceptional quality and timely delivery of all translated materials.
                </p>
                <Button variant="default" className="gap-2">
                  Request Translation Quote
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="text-center mb-12">
            <p className="section-subtitle">Leadership</p>
            <h2 className="headline-2 mb-4">Meet Our Team</h2>
            <p className="body-2 text-muted-foreground max-w-2xl mx-auto">
              Our experienced team combines publishing expertise with a passion 
              for African literature.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {team.map((member, index) => {
              const initials = member.name.split(' ').map(n => n[0]).join('');
              const showImage = Boolean(member.image && !failedImages[member.name]);

              return (
                <div key={index} className="text-center group p-6 rounded-2xl bg-card border hover:shadow-elevated transition-all duration-300">
                  <div className="w-20 h-20 mx-auto rounded-full overflow-hidden mb-4 ring-4 ring-transparent group-hover:ring-primary/30 transition-all bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                    {showImage ? (
                      <img
                        src={member.image}
                        alt={`${member.name} photo`}
                        className="w-full h-full object-cover"
                        onError={() => setFailedImages(prev => ({ ...prev, [member.name]: true }))}
                      />
                    ) : (
                      <span className="font-forum text-2xl text-primary">{initials}</span>
                    )}
                  </div>
                  <h3 className="font-forum text-lg">{member.name}</h3>
                  <p className="text-sm text-muted-foreground">{member.role}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-charcoal text-white">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="headline-2 text-white mb-4">Ready to Work With Us?</h2>
            <p className="body-2 text-white/70 mb-8">
              Whether you're an author looking to publish, a vendor seeking partnership, 
              or a reader exploring great books—we'd love to hear from you.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/publish">
                <Button variant="default" size="xl" className="gap-2 bg-primary hover:bg-primary/90">
                  Publish With Us
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link to="/books">
                <Button variant="outline" size="xl" className="border-white/30 text-white hover:bg-white/10">
                  Browse Books
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default About;