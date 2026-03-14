// src/pages/AuthorSubmissions.tsx
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/SupabaseClient';
import { useRole } from '@/contexts/RoleContext';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  BookOpen, FileText, Clock, CheckCircle, XCircle,
  TrendingUp, Eye, Download, DollarSign, Plus, Star
} from 'lucide-react';

interface Submission {
  id: string;
  title: string;
  subtitle: string | null;
  publishing_type: string;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  rejection_feedback: string | null;
  cover_image_url: string | null;
}

interface AuthorBook {
  id: string;
  title: string;
  cover_image: string | null;
  views: number;
  downloads: number;
  status: string;
  published_at: string | null;
}

interface AnalyticsSummary {
  totalViews: number;
  totalDownloads: number;
  totalRevenue: number;
  publishedBooks: number;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending:      { label: 'Pending Review', color: 'bg-amber-100 text-amber-700 border-amber-200',  icon: Clock },
  under_review: { label: 'Under Review',   color: 'bg-blue-100 text-blue-700 border-blue-200',     icon: Eye },
  approved:     { label: 'Approved',       color: 'bg-green-100 text-green-700 border-green-200',  icon: CheckCircle },
  rejected:     { label: 'Rejected',       color: 'bg-red-100 text-red-700 border-red-200',        icon: XCircle },
};

const AuthorSubmissions: React.FC = () => {
  const { userId, isAuthor, loading: roleLoading } = useRole();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [submissions, setSubmissions]   = useState<Submission[]>([]);
  const [books, setBooks]               = useState<AuthorBook[]>([]);
  const [analytics, setAnalytics]       = useState<AnalyticsSummary>({ totalViews: 0, totalDownloads: 0, totalRevenue: 0, publishedBooks: 0 });
  const [activeTab, setActiveTab]       = useState<'overview' | 'submissions' | 'books'>('overview');
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    if (!roleLoading && !isAuthor) {
      navigate('/');
      return;
    }
    if (!roleLoading && userId) loadData();
  }, [isAuthor, roleLoading, userId]);

  const loadData = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [subsRes, booksRes, analyticsRes] = await Promise.all([
        supabase.from('publications')
          .select('id,title,subtitle,publishing_type,status,created_at,reviewed_at,rejection_feedback,cover_image_url')
          .eq('submitted_by', userId)
          .order('created_at', { ascending: false }),
        supabase.from('books')
          .select('id,title,cover_image,views,downloads,status,published_at')
          .eq('author_id', userId)
          .order('published_at', { ascending: false }),
        supabase.from('author_analytics')
          .select('event_type,revenue')
          .eq('author_id', userId),
      ]);

      if (subsRes.data) setSubmissions(subsRes.data);
      if (booksRes.data) setBooks(booksRes.data);

      if (analyticsRes.data) {
        const data = analyticsRes.data;
        setAnalytics({
          totalViews:      data.filter(d => d.event_type === 'view').length,
          totalDownloads:  data.filter(d => d.event_type === 'download').length,
          totalRevenue:    data.reduce((acc, d) => acc + (d.revenue || 0), 0),
          publishedBooks:  booksRes.data?.filter(b => b.status === 'published').length ?? 0,
        });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (loading || roleLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  const pendingCount  = submissions.filter(s => s.status === 'pending' || s.status === 'under_review').length;
  const approvedCount = submissions.filter(s => s.status === 'approved').length;
  const rejectedCount = submissions.filter(s => s.status === 'rejected').length;

  return (
    <Layout>
      <div className="container py-8 max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Star className="h-5 w-5 text-primary fill-primary" />
              <span className="text-sm font-medium text-primary uppercase tracking-widest">Author Portal</span>
            </div>
            <h1 className="text-3xl font-bold">My Dashboard</h1>
            <p className="text-muted-foreground mt-1">Track your manuscripts and publishing performance</p>
          </div>
          <Button asChild>
            <Link to="/publish/submit"><Plus className="h-4 w-4 mr-1.5" />New Submission</Link>
          </Button>
        </div>

        {/* Analytics cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Published Books', value: analytics.publishedBooks, icon: BookOpen,    color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Total Views',     value: analytics.totalViews,     icon: Eye,         color: 'text-blue-600',   bg: 'bg-blue-50' },
            { label: 'Downloads',       value: analytics.totalDownloads, icon: Download,    color: 'text-violet-600', bg: 'bg-violet-50' },
            { label: 'Revenue (KSh)',   value: analytics.totalRevenue.toLocaleString(), icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50' },
          ].map((s, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className={`h-8 w-8 rounded-lg ${s.bg} flex items-center justify-center mb-3`}>
                  <s.icon className={`h-4 w-4 ${s.color}`} />
                </div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Submission summary pills */}
        <div className="flex gap-3 mb-6">
          {[
            { label: 'Pending', count: pendingCount,  color: 'bg-amber-100 text-amber-700' },
            { label: 'Approved', count: approvedCount, color: 'bg-green-100 text-green-700' },
            { label: 'Rejected', count: rejectedCount, color: 'bg-red-100 text-red-700' },
          ].map(p => (
            <div key={p.label} className={`px-3 py-1.5 rounded-full text-sm font-medium ${p.color}`}>
              {p.count} {p.label}
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-muted/40 rounded-lg p-1 w-fit">
          {(['overview', 'submissions', 'books'] as const).map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
                activeTab === t ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Overview tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Recent Submissions</CardTitle>
              </CardHeader>
              <CardContent>
                {submissions.slice(0, 3).length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="text-muted-foreground">No submissions yet</p>
                    <Button className="mt-3" size="sm" asChild>
                      <Link to="/publish/submit">Submit your first manuscript</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {submissions.slice(0, 3).map(s => {
                      const cfg = statusConfig[s.status] || statusConfig.pending;
                      return (
                        <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                          <div>
                            <p className="font-medium text-sm">{s.title}</p>
                            <p className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</p>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.color}`}>{cfg.label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {books.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Your Published Books</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {books.slice(0, 4).map(b => (
                      <div key={b.id} className="flex gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                        {b.cover_image ? (
                          <img src={b.cover_image} alt={b.title} className="h-14 w-10 object-cover rounded" />
                        ) : (
                          <div className="h-14 w-10 bg-muted rounded flex items-center justify-center">
                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{b.title}</p>
                          <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-0.5"><Eye className="h-3 w-3" />{b.views}</span>
                            <span className="flex items-center gap-0.5"><Download className="h-3 w-3" />{b.downloads}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Submissions tab */}
        {activeTab === 'submissions' && (
          <Card>
            <CardContent className="p-0">
              {submissions.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground mb-3">You haven't submitted any manuscripts yet</p>
                  <Button asChild><Link to="/publish/submit">Submit Manuscript</Link></Button>
                </div>
              ) : (
                <div className="divide-y">
                  {submissions.map(s => {
                    const cfg = statusConfig[s.status] || statusConfig.pending;
                    const StatusIcon = cfg.icon;
                    return (
                      <div key={s.id} className="p-4 hover:bg-muted/20">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold truncate">{s.title}</p>
                              <Badge variant="outline" className="text-xs shrink-0">{s.publishing_type}</Badge>
                            </div>
                            {s.subtitle && <p className="text-sm text-muted-foreground">{s.subtitle}</p>}
                            <p className="text-xs text-muted-foreground mt-1">
                              Submitted {new Date(s.created_at).toLocaleDateString()}
                              {s.reviewed_at && ` · Reviewed ${new Date(s.reviewed_at).toLocaleDateString()}`}
                            </p>
                            {s.rejection_feedback && (
                              <div className="mt-2 p-2 bg-red-50 border border-red-100 rounded text-xs text-red-700">
                                <strong>Feedback:</strong> {s.rejection_feedback}
                              </div>
                            )}
                          </div>
                          <span className={`text-xs px-2.5 py-1 rounded-full border font-medium flex items-center gap-1 shrink-0 ${cfg.color}`}>
                            <StatusIcon className="h-3 w-3" />
                            {cfg.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Books tab */}
        {activeTab === 'books' && (
          <div>
            {books.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <BookOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">No published books yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {books.map(b => (
                  <Card key={b.id} className="hover:shadow-md transition-shadow">
                    {b.cover_image && (
                      <div className="aspect-[3/2] overflow-hidden rounded-t-lg">
                        <img src={b.cover_image} alt={b.title} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <CardContent className="p-4">
                      <p className="font-semibold">{b.title}</p>
                      {b.published_at && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Published {new Date(b.published_at).toLocaleDateString()}
                        </p>
                      )}
                      <div className="flex gap-4 mt-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{b.views} views</span>
                        <span className="flex items-center gap-1"><Download className="h-3.5 w-3.5" />{b.downloads} downloads</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AuthorSubmissions;