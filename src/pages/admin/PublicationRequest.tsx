// src/pages/admin/PublicationRequest.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/SupabaseClient';
import { useRole } from '@/contexts/RoleContext';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription
} from '@/components/ui/sheet';
import {
  CheckCircle, XCircle, Eye, Clock, FileText,
  ExternalLink, Calendar, User, BookOpen
} from 'lucide-react';

interface Publication {
  id: string;
  title: string;
  subtitle: string | null;
  author_name: string;
  author_email: string;
  author_phone: string | null;
  publishing_type: 'traditional' | 'self';
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  created_at: string;
  reviewed_at: string | null;
  rejection_feedback: string | null;
  admin_notes: string | null;
  manuscript_file_url: string | null;
  cover_image_url: string | null;
  description: string;
  language: string;
  pages: number | null;
  isbn: string | null;
  keywords: string[] | null;
  target_audience: string | null;
  category_name: string | null;
  submitted_by_email: string | null;
}

const statusColor: Record<string, string> = {
  pending:      'bg-amber-100 text-amber-700 border-amber-200',
  under_review: 'bg-blue-100 text-blue-700 border-blue-200',
  approved:     'bg-green-100 text-green-700 border-green-200',
  rejected:     'bg-red-100 text-red-700 border-red-200',
};

const PublicationRequests: React.FC = () => {
  const { isAdmin, userId, loading: roleLoading } = useRole();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const [publications, setPublications] = useState<Publication[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading]           = useState(true);
  const [selected, setSelected]         = useState<Publication | null>(null);
  const [feedback, setFeedback]         = useState('');
  const [adminNotes, setAdminNotes]     = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!roleLoading && !isAdmin) { navigate('/'); return; }
    if (!roleLoading && isAdmin) loadPublications();
  }, [isAdmin, roleLoading]);

  // Auto-open from URL param
  useEffect(() => {
    const reviewId = searchParams.get('review');
    if (reviewId && publications.length > 0) {
      const pub = publications.find(p => p.id === reviewId);
      if (pub) openDetail(pub);
    }
  }, [searchParams, publications]);

  const loadPublications = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('publication_requests_view')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else setPublications(data || []);
    setLoading(false);
  };

  const filtered = statusFilter === 'all'
    ? publications
    : publications.filter(p => p.status === statusFilter);

  const openDetail = (pub: Publication) => {
    setSelected(pub);
    setFeedback(pub.rejection_feedback || '');
    setAdminNotes(pub.admin_notes || '');
  };

  const updateStatus = async (pubId: string, newStatus: 'approved' | 'rejected' | 'under_review') => {
    if (!userId) return;
    setActionLoading(true);
    try {
      const updatePayload: Record<string, any> = {
        status:      newStatus,
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
        admin_notes: adminNotes || null,
      };
      if (newStatus === 'rejected') updatePayload.rejection_feedback = feedback || null;

      const { error: updateError } = await supabase
        .from('publications')
        .update(updatePayload)
        .eq('id', pubId);

      if (updateError) throw updateError;

      // If approved → create book record
      if (newStatus === 'approved' && selected) {
        const { error: bookError } = await supabase.from('books').insert({
          title:          selected.title,
          subtitle:       selected.subtitle,
          author:         selected.author_name,
          description:    selected.description,
          category_id:    null, // category_name only, no id in view — fetch separately
          cover_image:    selected.cover_image_url,
          file_url:       selected.manuscript_file_url,
          publication_id: selected.id,
          language:       selected.language,
          pages:          selected.pages,
          isbn:           selected.isbn,
          keywords:       selected.keywords,
          target_audience: selected.target_audience,
          publishing_type: selected.publishing_type,
          status:         'published',
          published_at:   new Date().toISOString(),
        });
        if (bookError) throw bookError;
      }

      // Notify the submitter
      const { data: pubData } = await supabase
        .from('publications')
        .select('submitted_by')
        .eq('id', pubId)
        .single();

      if (pubData?.submitted_by) {
        const notifMessages: Record<string, { title: string; message: string; type: string }> = {
          approved:     { type: 'submission_approved', title: 'Manuscript Approved!', message: `Congratulations! Your manuscript "${selected?.title}" has been approved and is now live on Intercen Books.` },
          rejected:     { type: 'submission_rejected', title: 'Manuscript Decision', message: `Your manuscript "${selected?.title}" was not approved at this time.${feedback ? ` Feedback: ${feedback}` : ''}` },
          under_review: { type: 'submission_received', title: 'Manuscript Under Review', message: `Your manuscript "${selected?.title}" is now under editorial review.` },
        };
        const n = notifMessages[newStatus];
        await supabase.from('notifications').insert({
          user_id: pubData.submitted_by,
          type: n.type,
          title: n.title,
          message: n.message,
        });
      }

      toast({ title: `Publication ${newStatus}`, description: `"${selected?.title}" has been ${newStatus}.` });
      setSelected(null);
      await loadPublications();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const counts = {
    all:          publications.length,
    pending:      publications.filter(p => p.status === 'pending').length,
    under_review: publications.filter(p => p.status === 'under_review').length,
    approved:     publications.filter(p => p.status === 'approved').length,
    rejected:     publications.filter(p => p.status === 'rejected').length,
  };

  return (
    <Layout>
      <div className="container py-8 max-w-6xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center">
            <FileText className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Publication Requests</h1>
            <p className="text-sm text-muted-foreground">Review and manage manuscript submissions</p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {(['all', 'pending', 'under_review', 'approved', 'rejected'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap border transition-colors ${
                statusFilter === s
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background border-border hover:bg-muted'
              }`}
            >
              {s === 'all' ? 'All' : s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
              <span className="ml-1.5 text-xs opacity-70">({counts[s]})</span>
            </button>
          ))}
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-12 text-center text-muted-foreground">Loading submissions…</div>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">No submissions found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/30">
                    <tr>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Manuscript</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Author</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Type</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Submitted</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((pub) => (
                      <tr key={pub.id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="py-3 px-4">
                          <p className="font-medium">{pub.title}</p>
                          {pub.subtitle && <p className="text-xs text-muted-foreground">{pub.subtitle}</p>}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">{pub.author_name}</td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="text-xs capitalize">{pub.publishing_type}</Badge>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {new Date(pub.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex text-xs px-2 py-0.5 rounded-full border font-medium ${statusColor[pub.status]}`}>
                            {pub.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button size="sm" variant="ghost" onClick={() => openDetail(pub)}>
                            <Eye className="h-3.5 w-3.5 mr-1" />Review
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail Sheet */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto" side="right">
          {selected && (
            <>
              <SheetHeader className="mb-6">
                <SheetTitle className="text-xl">{selected.title}</SheetTitle>
                {selected.subtitle && <SheetDescription>{selected.subtitle}</SheetDescription>}
              </SheetHeader>

              <div className="space-y-6">
                {/* Status badge */}
                <span className={`inline-flex text-xs px-2.5 py-1 rounded-full border font-medium ${statusColor[selected.status]}`}>
                  {selected.status.replace('_', ' ')}
                </span>

                {/* Meta */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground"><User className="h-4 w-4" />{selected.author_name}</div>
                  <div className="flex items-center gap-2 text-muted-foreground"><Calendar className="h-4 w-4" />{new Date(selected.created_at).toLocaleDateString()}</div>
                  <div className="text-muted-foreground col-span-2">{selected.author_email}{selected.author_phone ? ` · ${selected.author_phone}` : ''}</div>
                </div>

                {/* Book details */}
                <div className="bg-muted/30 rounded-lg p-4 space-y-2 text-sm">
                  {selected.category_name && <div><span className="font-medium">Category:</span> {selected.category_name}</div>}
                  {selected.language && <div><span className="font-medium">Language:</span> {selected.language}</div>}
                  {selected.pages && <div><span className="font-medium">Pages:</span> {selected.pages}</div>}
                  {selected.isbn && <div><span className="font-medium">ISBN:</span> {selected.isbn}</div>}
                  {selected.target_audience && <div><span className="font-medium">Target:</span> {selected.target_audience}</div>}
                  {selected.keywords?.length ? <div><span className="font-medium">Keywords:</span> {selected.keywords.join(', ')}</div> : null}
                </div>

                {/* Description */}
                <div>
                  <p className="font-medium text-sm mb-1">Description</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{selected.description}</p>
                </div>

                {/* Files */}
                <div className="flex gap-3">
                  {selected.manuscript_file_url && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={selected.manuscript_file_url} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-3.5 w-3.5 mr-1" />View Manuscript
                      </a>
                    </Button>
                  )}
                  {selected.cover_image_url && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={selected.cover_image_url} target="_blank" rel="noreferrer">
                        <BookOpen className="h-3.5 w-3.5 mr-1" />View Cover
                      </a>
                    </Button>
                  )}
                </div>

                {/* Admin notes */}
                <div className="space-y-1">
                  <Label>Admin Notes (internal)</Label>
                  <Textarea
                    rows={2}
                    value={adminNotes}
                    onChange={e => setAdminNotes(e.target.value)}
                    placeholder="Internal notes about this submission…"
                    disabled={selected.status === 'approved'}
                  />
                </div>

                {/* Rejection feedback */}
                {selected.status !== 'approved' && (
                  <div className="space-y-1">
                    <Label>Rejection Feedback (sent to author)</Label>
                    <Textarea
                      rows={3}
                      value={feedback}
                      onChange={e => setFeedback(e.target.value)}
                      placeholder="Explain why this manuscript wasn't accepted…"
                      disabled={selected.status === 'approved'}
                    />
                  </div>
                )}

                {/* Actions */}
                {selected.status !== 'approved' && (
                  <div className="flex gap-3 pt-2">
                    {selected.status === 'pending' && (
                      <Button
                        variant="outline"
                        className="border-blue-300 text-blue-700 hover:bg-blue-50"
                        onClick={() => updateStatus(selected.id, 'under_review')}
                        disabled={actionLoading}
                      >
                        <Clock className="h-4 w-4 mr-1.5" />Mark Under Review
                      </Button>
                    )}
                    <Button
                      variant="default"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => updateStatus(selected.id, 'approved')}
                      disabled={actionLoading}
                    >
                      <CheckCircle className="h-4 w-4 mr-1.5" />Approve & Publish
                    </Button>
                    {selected.status !== 'rejected' && (
                      <Button
                        variant="destructive"
                        onClick={() => updateStatus(selected.id, 'rejected')}
                        disabled={actionLoading}
                      >
                        <XCircle className="h-4 w-4 mr-1.5" />Reject
                      </Button>
                    )}
                  </div>
                )}

                {selected.status === 'approved' && (
                  <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
                    <CheckCircle className="h-4 w-4 shrink-0" />
                    Approved and published on {selected.reviewed_at ? new Date(selected.reviewed_at).toLocaleDateString() : '—'}
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </Layout>
  );
};

export default PublicationRequests;