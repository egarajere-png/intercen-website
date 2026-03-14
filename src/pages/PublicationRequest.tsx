import { Header } from '@/components/layout/Header';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/SupabaseClient';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CheckCircle, XCircle, Eye, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { format } from 'date-fns';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Publication {
  id: string;
  title: string;
  subtitle: string | null;
  author_name: string;
  author_email: string;
  author_phone: string | null;
  author_bio: string | null;
  description: string;
  language: string;
  pages: number | null;
  isbn: string | null;
  publishing_type: 'traditional' | 'self';
  manuscript_file_url: string | null;
  cover_image_url: string | null;
  keywords: string[];
  target_audience: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'under_review';
  rejection_feedback: string | null;
  category_name: string | null;
  created_at: string;
  reviewed_at: string | null;
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------
const StatusBadge = ({ status }: { status: Publication['status'] }) => {
  const map: Record<string, string> = {
    pending:      'bg-amber-100 text-amber-800 border-amber-200',
    approved:     'bg-green-100 text-green-800 border-green-200',
    rejected:     'bg-red-100 text-red-800 border-red-200',
    under_review: 'bg-blue-100 text-blue-800 border-blue-200',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize border ${map[status] ?? map['pending']}`}>
      {status.replace('_', ' ')}
    </span>
  );
};

// ---------------------------------------------------------------------------
// Info row helper
// ---------------------------------------------------------------------------
const InfoRow = ({
  label,
  value,
  className = '',
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) => (
  <div>
    <p className="text-muted-foreground text-xs mb-0.5">{label}</p>
    <p className={`font-medium ${className}`}>{value}</p>
  </div>
);

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
const PublicationRequests = () => {
  const [publications,  setPublications]  = useState<Publication[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [selected,      setSelected]      = useState<Publication | null>(null);
  const [detailOpen,    setDetailOpen]    = useState(false);
  const [rejectOpen,    setRejectOpen]    = useState(false);
  const [rejectTarget,  setRejectTarget]  = useState<Publication | null>(null);
  const [feedback,      setFeedback]      = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [filterStatus,  setFilterStatus]  = useState<'all' | 'pending' | 'approved' | 'rejected' | 'under_review'>('pending');

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchPublications = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('publication_requests_view')
      .select('*')
      .order('created_at', { ascending: false });

    if (filterStatus !== 'all') {
      query = query.eq('status', filterStatus);
    }

    const { data, error } = await query;
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setPublications((data as unknown as Publication[]) ?? []);
    }
    setLoading(false);
  }, [filterStatus]);

  useEffect(() => { fetchPublications(); }, [fetchPublications]);

  // ── Approve ────────────────────────────────────────────────────────────────
  const handleApprove = async (pub: Publication) => {
    setActionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/approve-publication`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ publication_id: pub.id }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Approval failed');

      toast({ title: 'Approved!', description: json.message });
      setDetailOpen(false);
      fetchPublications();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  // ── Reject ─────────────────────────────────────────────────────────────────
  const handleReject = async () => {
    if (!rejectTarget) return;
    setActionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reject-publication`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ publication_id: rejectTarget.id, feedback }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Rejection failed');

      toast({ title: 'Rejected', description: json.message });
      setRejectOpen(false);
      setRejectTarget(null);
      setFeedback('');
      setDetailOpen(false);
      fetchPublications();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <Header />
      <div className="px-2 py-4 md:px-6 md:py-8 space-y-6 max-w-6xl mx-auto w-full">

        {/* Page header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="font-forum text-xl md:text-2xl font-semibold">Publication Requests</h1>
            <p className="text-xs md:text-sm text-muted-foreground mt-1">
              Review and manage manuscript submissions
            </p>
          </div>

          {/* Filter tabs */}
          <div className="flex flex-wrap gap-2">
            {(['pending', 'under_review', 'approved', 'rejected', 'all'] as const).map((s) => (
              <Button
                key={s}
                size="sm"
                variant={filterStatus === s ? 'default' : 'outline'}
                onClick={() => setFilterStatus(s)}
                className="capitalize"
              >
                {s.replace('_', ' ')}
              </Button>
            ))}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : publications.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            No {filterStatus === 'all' ? '' : filterStatus.replace('_', ' ')} submissions found.
          </div>
        ) : (
          <div className="rounded-xl border overflow-x-auto">
            <Table className="min-w-[600px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[140px]">Book Title</TableHead>
                  <TableHead className="min-w-[100px]">Author</TableHead>
                  <TableHead className="min-w-[100px]">Category</TableHead>
                  <TableHead className="min-w-[80px]">Type</TableHead>
                  <TableHead className="min-w-[110px]">Submitted</TableHead>
                  <TableHead className="min-w-[90px]">Status</TableHead>
                  <TableHead className="min-w-[110px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {publications.map((pub) => (
                  <TableRow key={pub.id}>
                    <TableCell className="font-medium">{pub.title}</TableCell>
                    <TableCell>{pub.author_name}</TableCell>
                    <TableCell>{pub.category_name ?? '—'}</TableCell>
                    <TableCell className="capitalize">{pub.publishing_type}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(pub.created_at), 'dd MMM yyyy')}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={pub.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button
                          size="icon"
                          variant="ghost"
                          title="View details"
                          onClick={() => { setSelected(pub); setDetailOpen(true); }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {(pub.status === 'pending' || pub.status === 'under_review') && (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              title="Approve"
                              onClick={() => handleApprove(pub)}
                              disabled={actionLoading}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Reject"
                              onClick={() => { setRejectTarget(pub); setRejectOpen(true); }}
                              disabled={actionLoading}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* ── Detail Dialog ── */}
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            {selected && (
              <>
                <DialogHeader>
                  <DialogTitle className="font-forum text-xl">{selected.title}</DialogTitle>
                  <DialogDescription>
                    Submitted by {selected.author_name} on{' '}
                    {format(new Date(selected.created_at), 'dd MMMM yyyy')}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 text-sm">
                  <div className="grid grid-cols-2 gap-3">
                    <InfoRow label="Author Email"    value={selected.author_email} />
                    <InfoRow label="Phone"           value={selected.author_phone ?? '—'} />
                    <InfoRow label="Category"        value={selected.category_name ?? '—'} />
                    <InfoRow label="Language"        value={selected.language} />
                    <InfoRow label="Pages"           value={selected.pages?.toString() ?? '—'} />
                    <InfoRow label="ISBN"            value={selected.isbn ?? '—'} />
                    <InfoRow label="Publishing Type" value={selected.publishing_type} className="capitalize" />
                    <InfoRow label="Status"          value={<StatusBadge status={selected.status} />} />
                  </div>

                  {selected.author_bio && (
                    <div>
                      <p className="font-medium mb-1 text-muted-foreground">Author Bio</p>
                      <p className="leading-relaxed">{selected.author_bio}</p>
                    </div>
                  )}

                  <div>
                    <p className="font-medium mb-1 text-muted-foreground">Description</p>
                    <p className="leading-relaxed">{selected.description}</p>
                  </div>

                  {selected.target_audience && (
                    <div>
                      <p className="font-medium mb-1 text-muted-foreground">Target Audience</p>
                      <p>{selected.target_audience}</p>
                    </div>
                  )}

                  {selected.keywords?.length > 0 && (
                    <div>
                      <p className="font-medium mb-1 text-muted-foreground">Keywords</p>
                      <div className="flex flex-wrap gap-2">
                        {selected.keywords.map((k) => (
                          <span key={k} className="bg-muted px-2 py-0.5 rounded text-xs">{k}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selected.cover_image_url && (
                    <div>
                      <p className="font-medium mb-2 text-muted-foreground">Cover Image</p>
                      <img src={selected.cover_image_url} alt="Cover" className="h-40 rounded-lg object-cover border" />
                    </div>
                  )}

                  {selected.manuscript_file_url && (
                    <a
                      href={selected.manuscript_file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-primary underline text-sm"
                    >
                      Download Manuscript
                    </a>
                  )}

                  {selected.rejection_feedback && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="font-medium text-red-700 mb-1">Rejection Feedback</p>
                      <p className="text-red-600">{selected.rejection_feedback}</p>
                    </div>
                  )}
                </div>

                {(selected.status === 'pending' || selected.status === 'under_review') && (
                  <DialogFooter className="gap-2 pt-2">
                    <Button
                      variant="outline"
                      className="border-red-300 text-red-600 hover:bg-red-50"
                      onClick={() => { setRejectTarget(selected); setRejectOpen(true); }}
                      disabled={actionLoading}
                    >
                      <XCircle className="h-4 w-4 mr-2" /> Reject
                    </Button>
                    <Button
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => handleApprove(selected)}
                      disabled={actionLoading}
                    >
                      {actionLoading
                        ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        : <CheckCircle className="h-4 w-4 mr-2" />}
                      Approve & Publish
                    </Button>
                  </DialogFooter>
                )}
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* ── Reject Dialog ── */}
        <Dialog open={rejectOpen} onOpenChange={(v) => { setRejectOpen(v); if (!v) { setRejectTarget(null); setFeedback(''); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Submission</DialogTitle>
              <DialogDescription>
                {rejectTarget && (
                  <span>"{rejectTarget.title}" by {rejectTarget.author_name}</span>
                )}
                <span className="block mt-1">Optionally provide feedback to help the author improve their manuscript.</span>
              </DialogDescription>
            </DialogHeader>
            <Textarea
              rows={5}
              placeholder="Your editorial feedback (optional)…"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
            />
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => { setRejectOpen(false); setRejectTarget(null); setFeedback(''); }}>
                Cancel
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={handleReject}
                disabled={actionLoading}
              >
                {actionLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Confirm Rejection
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </>
  );
};

export default PublicationRequests;