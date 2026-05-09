import React, { useEffect, useState } from 'react';
import { supabase } from '../../../supabaseClient';
import { notifyUser } from '../../lib/notify';

// star rendering helper used for both display and the input
const Stars = ({ value, onChange = null, size = 'text-base' }) => {
  return (
    <div className={`flex items-center gap-0.5 ${size}`}>
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          onClick={onChange ? () => onChange(i) : undefined}
          className={`${onChange ? 'cursor-pointer' : 'cursor-default'} ${i <= value ? 'text-amber-400' : 'text-gray-600'}`}
          aria-label={onChange ? `Set rating to ${i}` : `${i} stars`}
        >
          *
        </button>
      ))}
    </div>
  );
};

// read only 
export const ReviewsList = ({ userId }) => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('reviews')
        .select('id, rating, comment, created_at, reviewer_id, users:reviewer_id (username)')
        .eq('reviewee_id', userId)
        .order('created_at', { ascending: false });
      setReviews(data || []);
      setLoading(false);
    };
    void load();
  }, [userId]);

  if (loading) return <div className="text-gray-500 italic text-sm">Loading reviews...</div>;
  if (reviews.length === 0) return <div className="text-gray-500 italic text-sm">No reviews yet.</div>;

  const avg = reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Stars value={Math.round(avg)} size="text-xl" />
        <span className="text-sm text-gray-300">
          <span className="font-bold text-white">{avg.toFixed(1)}</span>
          <span className="text-gray-500"> - {reviews.length} review{reviews.length === 1 ? '' : 's'}</span>
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {reviews.map(r => (
          <div key={r.id} className="p-3 bg-[#0d1117] border border-white/5 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold text-white">{r.users?.username || 'Anonymous'}</span>
              <span className="text-xs text-gray-500">{new Date(r.created_at).toLocaleDateString()}</span>
            </div>
            <Stars value={r.rating} size="text-sm" />
            {r.comment && <p className="text-sm text-gray-300 mt-2 whitespace-pre-line">{r.comment}</p>}
          </div>
        ))}
      </div>
    </div>
  );
};

// lets users to leave reviews, using a transaction occuring to allow one review to be made
export const LeaveReviewForm = ({ viewer, revieweeId, transactionId, onSubmitted }) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!viewer || !revieweeId || !transactionId) return;
    setSubmitting(true);
    setError('');
    const { error: insErr } = await supabase
      .from('reviews')
      .insert({
        reviewer_id: viewer.id,
        reviewee_id: revieweeId,
        transaction_id: transactionId,
        rating,
        comment: comment.trim() || null,
      });
    if (insErr) {
      setError(insErr.message);
      setSubmitting(false);
      return;
    }
    await notifyUser({
      userId: revieweeId,
      type: 'review',
      title: `${viewer?.user_metadata?.username || 'A buyer'} left you a ${rating}-star review`,
      body: comment.trim() || null,
      link: `/user/${revieweeId}`,
    });
    setDone(true);
    setSubmitting(false);
    if (onSubmitted) onSubmitted();
  };

  if (done) {
    return <div className="text-emerald-400 font-semibold text-sm">Thanks - your review was posted.</div>;
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 bg-[#0d1117] border border-white/10 p-4 rounded-lg">
      <div className="flex items-center gap-3">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Rating:</span>
        <Stars value={rating} onChange={setRating} size="text-2xl" />
      </div>
      <textarea
        value={comment}
        onChange={e => setComment(e.target.value)}
        placeholder="Optional: how was the transaction?"
        rows={3}
        className="bg-[#161b22] border border-white/10 text-gray-100 placeholder-gray-500 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
      />
      {error && <div className="text-red-400 text-xs">{error}</div>}
      <button
        type="submit"
        disabled={submitting}
        className="self-start px-4 py-2 bg-blue-600 text-white rounded-md font-semibold text-sm hover:bg-blue-500 disabled:opacity-50"
      >
        {submitting ? 'Posting...' : 'Post review'}
      </button>
    </form>
  );
};

export default ReviewsList;
