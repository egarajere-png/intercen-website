import React from 'react';
import ReviewForm from '../components/ReviewForm';
import ReviewList from '../components/ReviewList';
import { useParams } from 'react-router-dom';

const ContentReviewsPage: React.FC = () => {
  const { id } = useParams();
  if (!id) return <div className="text-center py-12">Invalid content ID.</div>;
  return (
    <div className="container max-w-2xl mx-auto py-10 space-y-8">
      <h1 className="text-2xl font-bold mb-4">Reviews</h1>
      <ReviewForm contentId={id} onSuccess={() => window.location.reload()} />
      <ReviewList contentId={id} />
    </div>
  );
};

export default ContentReviewsPage;
