import React from 'react';

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  readOnly?: boolean;
  className?: string;
}

const StarRating: React.FC<StarRatingProps> = ({ value, onChange, readOnly = false, className = '' }) => {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className={`text-2xl focus:outline-none ${star <= value ? 'text-yellow-400' : 'text-neutral-300'} ${readOnly ? 'pointer-events-none' : ''}`}
          onClick={() => !readOnly && onChange && onChange(star)}
          aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
          tabIndex={readOnly ? -1 : 0}
        >
          ★
        </button>
      ))}
    </div>
  );
};

export default StarRating;
