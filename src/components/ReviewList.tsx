// src/components/ReviewList.tsx
import React, { useEffect, useState } from 'react';
import { getReviews, voteHelpful, reportReview } from '../services/reviews.service';
import StarRating from './ui/StarRating';
import { useAuth } from '../hooks/useAuth';
import { Button } from './ui/button';
import SimpleModal from './ui/SimpleModal';

interface ReviewListProps {
  contentId: string;
}

const sortOptions = [
  { value: 'recent', label: 'Most Recent' },
  { value: 'helpful', label: 'Most Helpful' },
  { value: 'rating_high', label: 'Highest Rated' },
  { value: 'rating_low', label: 'Lowest Rated' },
];

const ReviewList: React.FC<ReviewListProps> = ({ contentId }) => {
  const { user, isAuthenticated } = useAuth();
  const [reviews, setReviews] = useState<any[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [pagination, setPagination] = useState<any>(null);
  const [sortBy, setSortBy] = useState('recent');
  const [ratingFilter, setRatingFilter] = useState<number | undefined>();
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportModal, setReportModal] = useState<{ open: boolean; reviewId?: string } | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    fetchReviews();
    // eslint-disable-next-line
  }, [contentId, sortBy, ratingFilter, verifiedOnly, page]);

  async function fetchReviews() {
    setLoading(true);
    setError(null);
    try {
      const data = await getReviews({
        content_id: contentId,
        sort_by: sortBy,
        rating_filter: ratingFilter,
        verified_only: verifiedOnly,
        page,
      });
      setReviews(data.reviews || []);
      setStatistics(data.statistics || null);
      setPagination(data.pagination || null);
    } catch (err: any) {
      // Try to parse Supabase error for user-friendly message
      let message = err?.message || 'Failed to load reviews';
      try {
        const parsed = typeof err === 'string' ? JSON.parse(err) : err;
        if (parsed?.event_message) {
          if (parsed.event_message.includes('User trying to report own review')) {
            message = 'You cannot report your own review.';
          } else {
            message = parsed.event_message;
          }
        }
      } catch {}
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  const handleVoteHelpful = async (reviewId: string) => {
    if (!isAuthenticated) {
      alert('Please log in to vote on reviews');
      return;
    }
    try {
      await voteHelpful(reviewId);
      fetchReviews();
    } catch (err: any) {
      alert(err.message || 'Failed to vote');
    }
  };

  const openReportModal = (reviewId: string) => {
    setReportModal({ open: true, reviewId });
    setReportReason('');
    setReportError(null);
  };

  const closeReportModal = () => {
    setReportModal(null);
    setReportReason('');
    setReportError(null);
    setReportLoading(false);
  };

  const handleReportSubmit = async () => {
    if (!isAuthenticated) {
      setReportError('Please log in to report reviews');
      return;
    }
    if (!reportReason || reportReason.trim().length < 10) {
      setReportError('Please provide a reason (at least 10 characters)');
      return;
    }
    setReportLoading(true);
    try {
      await reportReview({ review_id: reportModal?.reviewId, reason: reportReason });
      closeReportModal();
      // Show a toast or onscreen message for success
      // toast.success('Reported. Thank you!');
    } catch (err: any) {
      // Try to parse Supabase error for user-friendly message
      let message = err?.message || 'Failed to report review';
      // If error is a structured object with status_code 403 or has event_message, show full JSON
      if (err?.response?.status_code === 403 || err?.response?.event_message || err?.status === 403) {
        // Show the full error JSON, formatted
        setReportError(
          <pre style={{whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: 12, color: '#b91c1c', background: '#fef2f2', padding: 8, borderRadius: 4, maxHeight: 300, overflow: 'auto'}}>
            {JSON.stringify(err?.response || err, null, 2)}
          </pre>
        );
        return;
      }
      if (err?.response?.event_message) {
        if (err.response.event_message.includes('User trying to report own review')) {
          message = 'You cannot report your own review.';
        } else {
          message = err.response.event_message;
        }
      } else if (err?.response?.error) {
        message = err.response.error;
      }
      setReportError(message);
    } finally {
      setReportLoading(false);
    }
  };

  const getRatingCount = (rating: number) => {
    if (!statistics?.distribution) return 0;
    const item = statistics.distribution.find((d: any) => d.rating === rating);
    return item?.count || 0;
  };

  const totalReviews = statistics?.total_reviews || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 items-center">
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="border rounded px-2 py-1 font-serif text-base">
          {sortOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <label className="flex items-center gap-1 font-serif text-base">
          <input type="checkbox" checked={verifiedOnly} onChange={e => setVerifiedOnly(e.target.checked)} />
          Verified only
        </label>
        <span className="ml-2 text-base font-serif text-neutral-500">Filter by rating:</span>
        {[5,4,3,2,1].map(star => (
          <Button
            key={star}
            variant={ratingFilter === star ? 'hero' : 'outline'}
            size="sm"
            className={`px-2 py-1 rounded text-base font-serif ${ratingFilter === star ? 'text-white' : ''}`}
            onClick={() => setRatingFilter(ratingFilter === star ? undefined : star)}
          >
            {star} ★
          </Button>
        ))}
      </div>
      {error && <div className="text-red-500 text-sm">{error}</div>}
      {loading ? <div>Loading reviews...</div> : (
        <div className="space-y-4">
          {reviews.length === 0 && <div className="text-neutral-500">No reviews yet.</div>}
          {reviews.map(review => (
            <div key={review.id} className="bg-white dark:bg-neutral-900 rounded-lg shadow p-6">
              <div className="flex items-center gap-3 mb-2">
                <img 
                  src={review.profiles?.avatar_url || '/default-avatar.png'} 
                  alt="avatar" 
                  className="w-10 h-10 rounded-full object-cover border border-neutral-200 dark:border-neutral-700" 
                />
                <div>
                  <div className="font-serif font-bold text-neutral-800 dark:text-neutral-100 text-lg">
                    {review.profiles?.full_name || 'Anonymous'}
                  </div>
                  <div className="text-xs text-neutral-500 font-mono">{new Date(review.created_at).toLocaleDateString()}</div>
                </div>
                <StarRating value={review.rating} readOnly className="ml-auto" />
              </div>
              {review.title && <div className="font-serif font-semibold mb-1 text-base">{review.title}</div>}
              <div className="mb-2 text-neutral-800 dark:text-neutral-100 font-sans text-base leading-relaxed">{review.review_text}</div>
              <div className="flex gap-4 text-base text-neutral-500 font-serif">
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => handleVoteHelpful(review.id)} 
                  className={`hover:text-primary-600 px-3 py-1 ${!isAuthenticated && 'cursor-not-allowed opacity-60'}`}
                  title={!isAuthenticated ? 'Log in to vote' : ''}
                >
                  Helpful ({review.helpful_count || 0})
                </Button>
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => openReportModal(review.id)} 
                  className={`hover:text-red-600 px-3 py-1 ${!isAuthenticated && 'cursor-not-allowed opacity-60'}`}
                  title={!isAuthenticated ? 'Log in to report' : ''}
                >
                  Report
                </Button>
                {review.is_verified_purchase && <span className="text-green-600 font-bold">Verified Purchase</span>}
              </div>
            </div>
          ))}
        </div>
      )}
      {pagination && (
        <div className="flex gap-2 mt-4 items-center">
          <Button
            variant="outline"
            size="sm"
            className="px-3 py-1 font-serif"
            disabled={!pagination.has_prev_page}
            onClick={() => setPage(page - 1)}
          >Prev</Button>
          <span className="px-2 font-serif">Page {pagination.page} of {pagination.total_pages}</span>
          <Button
            variant="outline"
            size="sm"
            className="px-3 py-1 font-serif"
            disabled={!pagination.has_next_page}
            onClick={() => setPage(page + 1)}
          >Next</Button>
        </div>
      )}
      {statistics && (
        <div className="mt-6">
          <h4 className="font-serif font-bold mb-2 text-lg">Rating Distribution</h4>
          {[5,4,3,2,1].map(star => {
            const count = getRatingCount(star);
            const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
            return (
              <div key={star} className="flex items-center gap-2 mb-1">
                <span className="text-base w-8 font-serif">{star} ★</span>
                <div className="w-40 bg-neutral-200 dark:bg-neutral-700 rounded h-2">
                  <div
                    className="bg-primary-600 h-2 rounded"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-xs font-mono">{count}</span>
              </div>
            );
          })}
        </div>
      )}
      <SimpleModal open={!!reportModal?.open} onClose={closeReportModal} title="Report Review">
        <div className="space-y-4">
          <textarea
            className="w-full border rounded px-3 py-2 text-neutral-900 dark:text-neutral-100 bg-neutral-100 dark:bg-neutral-800"
            placeholder="Please describe the issue (at least 10 characters)"
            value={reportReason}
            onChange={e => setReportReason(e.target.value)}
            rows={4}
            maxLength={500}
            disabled={reportLoading}
          />
          {reportError && (
            typeof reportError === 'string' ? (
              <div className="text-red-500 text-sm">{reportError}</div>
            ) : reportError
          )}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={closeReportModal} disabled={reportLoading}>Cancel</Button>
            <Button variant="hero" onClick={handleReportSubmit} disabled={reportLoading}>
              {reportLoading ? 'Reporting...' : 'Submit Report'}
            </Button>
          </div>
        </div>
      </SimpleModal>
    </div>
  );
};

export default ReviewList;