import { Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Edit, 
  Palette, 
  Printer, 
  Truck, 
  GraduationCap, 
  FileText,
  ArrowRight,
  CheckCircle,
  BookOpen,
  Users,
  Award
} from 'lucide-react';

const services = [
  {
    icon: Edit,
    title: "Editorial Services",
    description: "Professional editing to polish your manuscript and ensure it's ready for publication.",
    features: [
      "Developmental editing",
      "Copy editing",
      "Proofreading",
      "Manuscript assessment"
    ],
    price: "From KES 15,000"
  },
  {
    icon: Palette,
    title: "Design & Layout",
    description: "Eye-catching cover designs and professional interior layouts that capture readers.",
    features: [
      "Custom cover design",
      "Interior formatting",
      "Illustration services",
      "Brand identity"
    ],
    price: "From KES 25,000"
  },
  {
    icon: Printer,
    title: "Printing Services",
    description: "High-quality book printing with flexible quantities and fast turnaround times.",
    features: [
      "Offset printing",
      "Print-on-demand",
      "Special finishes",
      "Bulk discounts"
    ],
    price: "Quote-based"
  },
  {
    icon: Truck,
    title: "Distribution",
    description: "Get your books into bookstores, libraries, and readers' hands across the region.",
    features: [
      "Retail distribution",
      "Library supply",
      "Online marketplace",
      "International shipping"
    ],
    price: "Commission-based"
  },
  {
    icon: FileText,
    title: "Publishing Packages",
    description: "Comprehensive publishing solutions that handle everything from manuscript to market.",
    features: [
      "Full-service publishing",
      "ISBN registration",
      "Copyright filing",
      "Marketing support"
    ],
    price: "From KES 80,000"
  },
  {
    icon: GraduationCap,
    title: "Workshops & Training",
    description: "Develop your writing and publishing skills through our expert-led programs.",
    features: [
      "Writing workshops",
      "Publishing masterclasses",
      "Author branding",
      "Book marketing"
    ],
    price: "From KES 5,000"
  }
];

const packages = [
  {
    name: "Starter",
    description: "Perfect for first-time authors",
    price: "KES 45,000",
    features: [
      "Manuscript assessment",
      "Basic copy editing",
      "Cover design (template)",
      "Interior formatting",
      "ISBN registration",
      "10 author copies"
    ],
    highlighted: false
  },
  {
    name: "Professional",
    description: "Our most popular package",
    price: "KES 95,000",
    features: [
      "Developmental editing",
      "Full copy editing",
      "Proofreading",
      "Custom cover design",
      "Interior formatting",
      "ISBN & copyright",
      "50 author copies",
      "Basic marketing kit"
    ],
    highlighted: true
  },
  {
    name: "Premium",
    description: "Complete publishing solution",
    price: "KES 180,000",
    features: [
      "All Professional features",
      "Illustrations (up to 10)",
      "100 author copies",
      "Retail distribution",
      "Launch event support",
      "PR & marketing campaign",
      "Author website setup",
      "Ongoing sales support"
    ],
    highlighted: false
  }
];

const ProductsServices = () => {
  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-warm py-16 md:py-24">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-10 left-20 w-80 h-80 bg-secondary/30 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
        </div>
        
        <div className="container relative">
          <div className="max-w-3xl mx-auto text-center">
            <p className="section-subtitle">What We Offer</p>
            <h1 className="headline-1 mb-6">
              Products & Services
              <span className="block text-primary">For Authors & Publishers</span>
            </h1>
            <p className="body-1 text-muted-foreground mb-8 max-w-2xl mx-auto">
              From manuscript to marketplace, we provide everything you need to 
              publish, print, and promote your books successfully.
            </p>
            <Button variant="hero" size="xl" className="gap-2">
              Get a Quote
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="text-center mb-12">
            <p className="section-subtitle">Our Services</p>
            <h2 className="headline-2 mb-4">Comprehensive Publishing Solutions</h2>
            <p className="body-2 text-muted-foreground max-w-2xl mx-auto">
              Whether you need a single service or a complete publishing package, 
              our experienced team is ready to help bring your vision to life.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service, index) => (
              <Card 
                key={index} 
                className="group hover:shadow-elevated transition-all duration-300 hover:-translate-y-1"
              >
                <CardHeader>
                  <div className="h-12 w-12 rounded-xl bg-accent flex items-center justify-center mb-4 group-hover:bg-primary group-hover:scale-110 transition-all">
                    <service.icon className="h-6 w-6 text-primary group-hover:text-primary-foreground transition-colors" />
                  </div>
                  <CardTitle className="font-forum text-xl">{service.title}</CardTitle>
                  <CardDescription className="body-2">{service.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 mb-4">
                    {service.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground">Starting</p>
                    <p className="font-forum text-lg text-primary">{service.price}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Publishing Packages */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <p className="section-subtitle">Packages</p>
            <h2 className="headline-2 mb-4">Publishing Packages</h2>
            <p className="body-2 text-muted-foreground max-w-2xl mx-auto">
              Choose a package that fits your needs and budget. All packages include 
              professional guidance throughout your publishing journey.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {packages.map((pkg, index) => (
              <Card 
                key={index} 
                className={`relative overflow-hidden ${
                  pkg.highlighted 
                    ? 'border-primary shadow-elevated scale-105' 
                    : 'hover:shadow-elegant'
                } transition-all duration-300`}
              >
                {pkg.highlighted && (
                  <div className="absolute top-0 left-0 w-full bg-primary text-primary-foreground text-center py-1 text-sm font-medium">
                    Most Popular
                  </div>
                )}
                <CardHeader className={pkg.highlighted ? 'pt-10' : ''}>
                  <CardTitle className="font-forum text-2xl">{pkg.name}</CardTitle>
                  <CardDescription>{pkg.description}</CardDescription>
                  <div className="mt-4">
                    <span className="headline-2 text-primary">{pkg.price}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {pkg.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className="w-full" 
                    variant={pkg.highlighted ? 'default' : 'outline'}
                  >
                    Choose {pkg.name}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Literary Programs */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1">
              <div className="aspect-[4/3] rounded-2xl overflow-hidden">
                <img 
                  src="https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&h=600&fit=crop"
                  alt="Writing workshop"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            
            <div className="order-1 lg:order-2">
              <p className="section-subtitle section-subtitle-left">Programs</p>
              <h2 className="headline-2 mb-6">Literary Programs & Workshops</h2>
              <p className="body-2 text-muted-foreground mb-6">
                Develop your craft and learn the business of publishing through 
                our expert-led workshops and training programs designed for writers at all levels.
              </p>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-xl">
                  <BookOpen className="h-6 w-6 text-primary shrink-0" />
                  <div>
                    <h4 className="font-forum text-lg mb-1">Creative Writing Workshops</h4>
                    <p className="text-sm text-muted-foreground">
                      Master the art of storytelling, character development, and narrative structure.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-xl">
                  <Users className="h-6 w-6 text-primary shrink-0" />
                  <div>
                    <h4 className="font-forum text-lg mb-1">Author Masterclasses</h4>
                    <p className="text-sm text-muted-foreground">
                      Learn from published authors about the publishing industry and building your platform.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-xl">
                  <Award className="h-6 w-6 text-primary shrink-0" />
                  <div>
                    <h4 className="font-forum text-lg mb-1">Book Marketing Bootcamp</h4>
                    <p className="text-sm text-muted-foreground">
                      Strategies for promoting your book and building a loyal readership.
                    </p>
                  </div>
                </div>
              </div>
              
              <Button variant="default" size="lg" className="gap-2">
                View Upcoming Programs
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-charcoal text-white">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="headline-2 text-white mb-4">Need a Custom Solution?</h2>
            <p className="body-2 text-white/70 mb-8">
              Every project is unique. Contact us to discuss your specific requirements 
              and we'll create a tailored package just for you.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="gold" size="xl">
                Request Custom Quote
              </Button>
              <Button variant="outline" size="xl" className="border-white/30 text-white hover:bg-white/10">
                Contact Our Team
              </Button>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default ProductsServices;
