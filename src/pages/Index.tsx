import { Layout } from '@/components/layout/Layout';
import { Seo } from '@/components/Seo';
import { HeroSection } from '@/components/home/HeroSection';
import { FeaturedBooks } from '@/components/home/FeaturedBooks';
import { CategorySection } from '@/components/home/CategorySection';
import { BestsellerSection } from '@/components/home/BestsellerSection';
import { PromoBanner } from '@/components/home/PromoBanner';


const Index = () => {
  return (
    <Layout>
      <Seo
        title="Intercen Books | East Africa's Leading Publisher & Book Marketplace"
        description="Discover, buy, and publish books with Intercen Books. Connecting authors and readers across East Africa. Browse our marketplace or publish your story today!"
        canonical="https://www.intercenbooks.com/"
      />
      <HeroSection />
      {/* <FeaturedBooks /> */}
      <CategorySection />
      <PromoBanner />
      {/* <BestsellerSection /> */}
    </Layout>
  );
};

export default Index;
