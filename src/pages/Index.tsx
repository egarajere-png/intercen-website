import { Layout } from '@/components/layout/Layout';
import { HeroSection } from '@/components/home/HeroSection';
import { FeaturedBooks } from '@/components/home/FeaturedBooks';
import { CategorySection } from '@/components/home/CategorySection';
import { BestsellerSection } from '@/components/home/BestsellerSection';
import { PromoBanner } from '@/components/home/PromoBanner';

const Index = () => {
  return (
    <Layout>
      <HeroSection />
      <FeaturedBooks />
      <CategorySection />
      <PromoBanner />
      <BestsellerSection />
    </Layout>
  );
};

export default Index;
