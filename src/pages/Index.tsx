import { Layout } from '@/components/layout/Layout';
import { HeroSection } from '@/components/home/HeroSection';
import { FeaturedBooks } from '@/components/home/FeaturedBooks';
import { CategorySection } from '@/components/home/CategorySection';
import { BestsellerSection } from '@/components/home/BestsellerSection';
import { PromoBanner } from '@/components/home/PromoBanner';
import ProfileSetup from './ProfileSetup';

const Index = () => {
  return (
    <Layout>
      <HeroSection />
      <FeaturedBooks />
      <CategorySection />
      <PromoBanner />
      <BestsellerSection />
      <Route path="/profile-setup" element={<ProfileSetup />} />
    </Layout>
  );
};

export default Index;
