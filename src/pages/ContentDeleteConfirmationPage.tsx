import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ContentDeleteConfirmationPage() {
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="container max-w-lg mx-auto py-20 flex flex-col items-center justify-center text-center">
        <CheckCircle2 className="h-16 w-16 text-green-600 mb-6" />
        <h1 className="font-forum text-3xl md:text-4xl text-primary mb-4">Content Deleted</h1>
        <p className="text-muted-foreground mb-8">
          The content has been successfully deleted from the system.<br />
          All associated files, reviews, and records have been removed.
        </p>
        <Button variant="hero" size="lg" onClick={() => navigate('/')}>Return to Home</Button>
      </div>
    </Layout>
  );
}
