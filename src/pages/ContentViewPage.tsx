import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/SupabaseClient';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Layout } from '@/components/layout/Layout';
import { toast } from 'sonner';
// import { VersionHistory } from '@/components/contents/VersionManagement';

const ContentViewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState<any>(null);

  useEffect(() => {
    if (id) {
      fetchContent();
    }
    // eslint-disable-next-line
  }, [id]);

  const fetchContent = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('content')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      setContent(data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load content');
      navigate('/content-management');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="container max-w-3xl py-12 flex items-center justify-center">
          <span className="text-muted-foreground">Loading...</span>
        </div>
      </Layout>
    );
  }

  if (!content) {
    return null;
  }

  return (
    <Layout>
      <div className="container max-w-3xl py-16 px-2 md:px-0">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-10 gap-4 border-b border-gray-200 pb-6">
          <div>
            <h1 className="font-forum text-4xl md:text-5xl text-primary font-bold tracking-tight mb-2 leading-tight">
              {content.title || 'Untitled Content'}
            </h1>
            <div className="flex flex-wrap gap-2 items-center text-sm text-muted-foreground font-medium">
              <span>by {content.author || 'N/A'}</span>
              <span className="hidden md:inline">|</span>
              <span className="capitalize">{content.content_type || 'N/A'}</span>
              <span className="hidden md:inline">|</span>
              <Badge variant="outline" className="uppercase tracking-wide">{content.status || 'draft'}</Badge>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(-1)} className="rounded-full px-6 py-2 font-semibold shadow-sm hover:bg-gray-100 transition">Back</Button>
            <Button variant="outline" onClick={() => navigate(`/content/update/${content.id}`)} className="rounded-full px-6 py-2 font-semibold shadow-sm hover:bg-gray-100 transition">Edit</Button>
          </div>
        </div>

        {/* Main Card Section */}
        <Card className="p-8 md:p-12 bg-gradient-to-br from-white to-gray-50 border border-gray-100 rounded-3xl shadow-2xl space-y-10">
          {/* Cover Image */}
          {content.cover_image_url && (
            <div className="flex justify-center mb-8">
              <img
                src={content.cover_image_url}
                alt="Cover"
                className="max-h-72 rounded-2xl shadow-xl border border-gray-200 object-contain bg-white p-2"
                style={{ boxShadow: '0 12px 40px 0 rgba(31, 38, 135, 0.18)' }}
              />
            </div>
          )}

          {/* Back Page Image (Apple-inspired formal section) */}
          {content.backpage_image_url && (
            <div className="my-8">
              <Card className="p-8 flex flex-col items-center bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-2xl shadow-xl">
                <div className="mb-4 w-full flex flex-col items-center">
                  <span className="text-xl font-semibold text-gray-800 tracking-tight mb-2 font-forum" style={{letterSpacing: '0.01em'}}>Back Page Preview</span>
                  <span className="text-xs text-gray-500 mb-4">A formal preview of the back page as seen in published content</span>
                  <div className="w-full flex justify-center">
                    <img
                      src={content.backpage_image_url}
                      alt="Back Page"
                      className="max-h-64 rounded-xl border border-gray-200 object-contain bg-white p-2 shadow-md"
                      style={{ boxShadow: '0 4px 24px 0 rgba(31, 38, 135, 0.10)' }}
                    />
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Metadata Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-base">
            <div className="space-y-2">
              <div><span className="font-semibold text-gray-700">Publisher:</span> <span className="text-gray-600">{content.publisher || 'N/A'}</span></div>
              <div><span className="font-semibold text-gray-700">ISBN:</span> <span className="text-gray-600">{content.isbn || 'N/A'}</span></div>
              <div><span className="font-semibold text-gray-700">Language:</span> <span className="text-gray-600">{content.language || 'N/A'}</span></div>
              <div><span className="font-semibold text-gray-700">Content Type:</span> <span className="text-gray-600 capitalize">{content.content_type || 'N/A'}</span></div>
              <div><span className="font-semibold text-gray-700">Category:</span> <span className="text-gray-600">{content.category_id || 'N/A'}</span></div>
              <div><span className="font-semibold text-gray-700">Page Count:</span> <span className="text-gray-600">{content.page_count || 'N/A'}</span></div>
              <div><span className="font-semibold text-gray-700">Version:</span> <span className="text-gray-600">{content.version || '1.0'}</span></div>
            </div>
            <div className="space-y-2">
              <div><span className="font-semibold text-gray-700">Visibility:</span> <Badge variant="outline" className="ml-2 uppercase tracking-wide">{content.visibility || 'private'}</Badge></div>
              <div><span className="font-semibold text-gray-700">Status:</span> <Badge variant="outline" className="ml-2 uppercase tracking-wide">{content.status || 'draft'}</Badge></div>
              <div><span className="font-semibold text-gray-700">Price:</span> <span className="text-gray-600">{content.price ? `KSH ${content.price}` : 'Free'}</span></div>
              <div><span className="font-semibold text-gray-700">Uploaded:</span> <span className="text-gray-600">{content.created_at ? new Date(content.created_at).toLocaleString() : 'Unknown'}</span></div>
              <div><span className="font-semibold text-gray-700">Last Updated:</span> <span className="text-gray-600">{content.updated_at ? new Date(content.updated_at).toLocaleString() : 'Never'}</span></div>
              <div><span className="font-semibold text-gray-700">Downloads:</span> <span className="text-gray-600">{content.total_downloads || 0}</span></div>
              <div><span className="font-semibold text-gray-700">Reviews:</span> <span className="text-gray-600">{content.total_reviews || 0}</span></div>
            </div>
          </div>

          {/* Description Section */}
          <div className="pt-6">
            <div className="font-semibold text-lg mb-2 text-gray-800 font-forum">Description</div>
            <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-line text-gray-600 bg-gray-50 rounded-xl p-4 border border-gray-100 shadow-sm">
              {content.description || 'No description provided.'}
            </div>
          </div>

          {/* File Download */}
          {content.file_url && (
            <div className="mt-8 flex justify-center">
              <Button asChild variant="hero" className="rounded-full px-8 py-3 text-lg font-semibold shadow-md bg-primary text-white hover:bg-primary/90 transition">
                <a href={content.file_url} target="_blank" rel="noopener noreferrer" download>
                  Download Content File
                </a>
              </Button>
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
};

export default ContentViewPage;
