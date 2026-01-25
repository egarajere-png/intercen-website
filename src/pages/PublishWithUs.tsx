import { Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BookOpen, 
  Users, 
  FileText, 
  CheckCircle, 
  ArrowRight, 
  Pen,
  Building,
  Globe,
  Award,
  Send
} from 'lucide-react';

const publishingOptions = [
  {
    icon: BookOpen,
    title: "Traditional Publishing",
    description: "Partner with us for full editorial, design, and distribution support. We handle everything from manuscript to market.",
    features: [
      "Professional editing and proofreading",
      "Cover design and layout",
      "ISBN registration",
      "Wide distribution network",
      "Marketing support"
    ],
    cta: "Learn More"
  },
  {
    icon: Pen,
    title: "Self-Publishing Support",
    description: "Maintain creative control while leveraging our expertise. We provide the tools and guidance you need to succeed.",
    features: [
      "Editorial consultation",
      "Design services",
      "Print-on-demand options",
      "Digital publishing",
      "Author retains rights"
    ],
    cta: "Get Started"
  },
  {
    icon: Building,
    title: "Vendor Partnership",
    description: "Join our marketplace as a vendor. Reach thousands of readers and expand your book distribution network.",
    features: [
      "Access to our customer base",
      "Integrated payment processing",
      "Inventory management",
      "Sales analytics",
      "Marketing opportunities"
    ],
    cta: "Become a Vendor"
  }
];

const submissionSteps = [
  {
    step: 1,
    title: "Prepare Your Manuscript",
    description: "Ensure your manuscript is complete and formatted according to our submission guidelines."
  },
  {
    step: 2,
    title: "Submit Your Proposal",
    description: "Fill out our submission form with your manuscript summary, author bio, and sample chapters."
  },
  {
    step: 3,
    title: "Editorial Review",
    description: "Our editorial team will review your submission and provide feedback within 4-6 weeks."
  },
  {
    step: 4,
    title: "Contract & Onboarding",
    description: "If selected, we'll discuss terms and begin the publishing journey together."
  }
];

const stats = [
  { value: "500+", label: "Books Published" },
  { value: "200+", label: "Authors Partnered" },
  { value: "15+", label: "Years Experience" },
  { value: "10M+", label: "Readers Reached" }
];

const PublishWithUs = () => {
  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-warm py-16 md:py-24">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 right-10 w-72 h-72 bg-primary/30 rounded-full blur-3xl" />
          <div className="absolute bottom-10 left-10 w-96 h-96 bg-secondary/20 rounded-full blur-3xl" />
        </div>
        
        <div className="container relative">
          <div className="max-w-3xl mx-auto text-center">
            <p className="section-subtitle">Authors & Publishers</p>
            <h1 className="headline-1 mb-6">
              Publish Your Story
              <span className="block text-primary">With Intercen Books</span>
            </h1>
            <p className="body-1 text-muted-foreground mb-8 max-w-2xl mx-auto">
              Whether you're a first-time author or an established publisher, we provide 
              the expertise, resources, and reach to bring your books to readers across Africa and beyond.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild variant="hero" size="xl" className="gap-2">
                <Link to="/upload#top">
                  <FileText className="h-5 w-5" />
                  Submit Your Manuscript
                </Link>
              </Button>
              <Button asChild variant="hero-outline" size="xl" className="gap-2">
                <Link to="/upload#top">
                  <Users className="h-5 w-5" />
                  Become a Vendor
                </Link>
              </Button>
            </div>
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

      {/* Publishing Options */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="text-center mb-12">
            <p className="section-subtitle">Publishing Options</p>
            <h2 className="headline-2 mb-4">Choose Your Publishing Path</h2>
            <p className="body-2 text-muted-foreground max-w-2xl mx-auto">
              We offer flexible publishing solutions tailored to your needs, 
              whether you're seeking full support or prefer to maintain creative control.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {publishingOptions.map((option, index) => (
              <Card key={index} className="relative overflow-hidden group hover:shadow-elevated transition-all duration-300">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-gold" />
                <CardHeader>
                  <div className="h-14 w-14 rounded-xl bg-accent flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <option.icon className="h-7 w-7 text-primary" />
                  </div>
                  <CardTitle className="font-forum text-xl">{option.title}</CardTitle>
                  <CardDescription className="body-2">{option.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {option.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-sm text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button asChild variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Link to="/upload#top">
                      {option.cta}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Submission Process */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <p className="section-subtitle">How It Works</p>
            <h2 className="headline-2 mb-4">Manuscript Submission Process</h2>
            <p className="body-2 text-muted-foreground max-w-2xl mx-auto">
              Our streamlined submission process ensures your manuscript receives 
              the attention it deserves from our experienced editorial team.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-6">
              {submissionSteps.map((item, index) => (
                <div 
                  key={index} 
                  className="flex gap-4 p-6 bg-card rounded-xl border shadow-soft hover:shadow-elegant transition-shadow"
                >
                  <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center shrink-0">
                    <span className="font-forum text-xl text-primary-foreground">{item.step}</span>
                  </div>
                  <div>
                    <h3 className="font-forum text-lg mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="section-subtitle section-subtitle-left">Why Intercen Books</p>
              <h2 className="headline-2 mb-6">A Publisher You Can Trust</h2>
              <p className="body-2 text-muted-foreground mb-8">
                With over 15 years of experience in African publishing, we've built 
                a reputation for quality, integrity, and author-centric partnerships. 
                Our commitment goes beyond publishing—we nurture literary talent and 
                champion diverse voices.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center shrink-0">
                    <Globe className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-forum text-lg mb-1">Pan-African Reach</h4>
                    <p className="text-sm text-muted-foreground">
                      Distribution across Kenya, East Africa, and international markets.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center shrink-0">
                    <Award className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-forum text-lg mb-1">Award-Winning Publications</h4>
                    <p className="text-sm text-muted-foreground">
                      Our authors have received national and international literary recognition.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center shrink-0">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-forum text-lg mb-1">Author-First Approach</h4>
                    <p className="text-sm text-muted-foreground">
                      Fair contracts, transparent royalties, and ongoing author support.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="aspect-[4/3] rounded-2xl overflow-hidden">
                <img 
                  src="https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&h=600&fit=crop"
                  alt="Publishing workspace"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-6 -left-6 bg-card p-6 rounded-xl shadow-elevated max-w-xs">
                <p className="font-forum text-lg mb-2">"Intercen Books believed in my story when others didn't."</p>
                <p className="text-sm text-muted-foreground">— Sarah Muthoni, Author</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-charcoal text-white">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="headline-2 text-white mb-4">Ready to Get Published?</h2>
            <p className="body-2 text-white/70 mb-8">
              Take the first step towards sharing your story with the world. 
              Submit your manuscript today or reach out to discuss partnership opportunities.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild variant="gold" size="xl" className="gap-2">
                <Link to="/upload#top">
                  <Send className="h-5 w-5" />
                  Submit Manuscript
                </Link>
              </Button>
              <Button variant="outline" size="xl" className="border-white/30 text-white hover:bg-white/10">
                Contact Us
              </Button>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default PublishWithUs;
