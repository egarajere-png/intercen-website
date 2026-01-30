// src/components/ReviewForm.tsx
import React, { useState } from 'react';
import { submitReview } from '../services/reviews.service';
import StarRating from './ui/StarRating';
import { useAuth } from '../hooks/useAuth';
import { Button } from './ui/button';



interface ReviewFormProps {
  contentId: string;
  initialReview?: {
    rating: number;
    title?: string;
    review_text?: string;
  };
  onSuccess?: () => void;
}

const ReviewForm: React.FC<ReviewFormProps> = ({ contentId, initialReview, onSuccess }) => {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [rating, setRating] = useState(initialReview?.rating || 0);
  const [title, setTitle] = useState(initialReview?.title || '');
  const [reviewText, setReviewText] = useState(initialReview?.review_text || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      setError('Please log in to submit a review');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      await submitReview({ content_id: contentId, rating, title, review_text: reviewText });
      setSuccess(true);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to submit review');
    } finally {
      setLoading(false);
    }
  };

  // Debug output for troubleshooting
//   if (process.env.NODE_ENV !== 'production') {
//     console.log('ReviewForm debug:', {
//       user,
//       authLoading,
//       isAuthenticated,
//     });
//   }

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="bg-white dark:bg-neutral-900 rounded-lg shadow p-6">
        <div className="text-neutral-500">Loading...</div>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="bg-white dark:bg-neutral-900 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100 mb-4">
          Write a Review
        </h3>
        <p className="text-neutral-600 dark:text-neutral-400 mb-4">
          Please log in to write a review for this content.
        </p>
        <button
          onClick={() => window.location.href = '/login'}
          className="bg-primary-600 hover:bg-primary-700 text-white font-semibold px-4 py-2 rounded"
        >
          Log In
        </button>
      </div>
    );
  }

  // Show debug info in UI for troubleshooting
  if (!authLoading && isAuthenticated) {
    return (
      <div>
        {/* <div className="bg-yellow-100 text-yellow-800 p-2 mb-2 rounded text-xs">
          <strong>Debug Info:</strong><br />
          User: {user ? user.email : 'none'}<br />
          Authenticated: {isAuthenticated ? 'yes' : 'no'}
        </div> */}
        <form onSubmit={handleSubmit} className="bg-white dark:bg-neutral-900 rounded-lg shadow p-6 space-y-4">
          <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100">
            {initialReview ? 'Edit Your Review' : 'Write a Review'}
          </h3>
          <StarRating value={rating} onChange={setRating} />
          <input
            type="text"
            className="w-full border rounded px-3 py-2 text-neutral-900 dark:text-neutral-100 bg-neutral-100 dark:bg-neutral-800"
            placeholder="Title (optional)"
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={255}
          />
          <textarea
            className="w-full border rounded px-3 py-2 text-neutral-900 dark:text-neutral-100 bg-neutral-100 dark:bg-neutral-800"
            placeholder="Share your thoughts..."
            value={reviewText}
            onChange={e => setReviewText(e.target.value)}
            rows={4}
            maxLength={1000}
          />
          {error && <div className="text-red-500 text-sm">{error}</div>}
          {success && <div className="text-green-500 text-sm">Review submitted successfully!</div>}
          <Button
            type="submit"
            variant="hero"
            size="lg"
            className="w-full font-serif text-lg flex gap-2 items-center justify-center disabled:opacity-60"
            disabled={loading || rating < 1}
          >
            {loading ? 'Submitting...' : initialReview ? 'Update Review' : 'Submit Review'}
          </Button>
        </form>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-neutral-900 rounded-lg shadow p-6 space-y-4">
      <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100">
        {initialReview ? 'Edit Your Review' : 'Write a Review'}
      </h3>
      <StarRating value={rating} onChange={setRating} />
      <input
        type="text"
        className="w-full border rounded px-3 py-2 text-neutral-900 dark:text-neutral-100 bg-neutral-100 dark:bg-neutral-800"
        placeholder="Title (optional)"
        value={title}
        onChange={e => setTitle(e.target.value)}
        maxLength={255}
      />
      <textarea
        className="w-full border rounded px-3 py-2 text-neutral-900 dark:text-neutral-100 bg-neutral-100 dark:bg-neutral-800"
        placeholder="Share your thoughts..."
        value={reviewText}
        onChange={e => setReviewText(e.target.value)}
        rows={4}
        maxLength={1000}
      />
      {error && <div className="text-red-500 text-sm">{error}</div>}
      {success && <div className="text-green-500 text-sm">Review submitted successfully!</div>}
      <Button
        type="submit"
        variant="hero"
        size="lg"
        className="w-full font-serif text-lg flex gap-2 items-center justify-center disabled:opacity-60"
        disabled={loading || rating < 1}
      >
        {loading ? 'Submitting...' : initialReview ? 'Update Review' : 'Submit Review'}
      </Button>
    </form>
  );
};

export default ReviewForm;