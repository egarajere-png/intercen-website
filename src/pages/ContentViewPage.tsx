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
      <div className="container max-w-3xl py-12">
        <div className="flex items-center justify-between mb-6 gap-2 flex-wrap">
          <h1 className="font-forum text-3xl md:text-4xl text-primary">{content.title || 'Untitled Content'}</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(-1)}>Back</Button>
            <Button variant="outline" onClick={() => navigate(`/content/update/${content.id}`)}>Edit</Button>
            {/* Version History button/modal for viewing and downloading previous versions - removed */}
          </div>
        </div>
        <Card className="p-6 space-y-6">
          {/* Cover Image */}
          {content.cover_image_url && (
            <div className="flex justify-center mb-4">
              <img
                src={content.cover_image_url}
                alt="Cover"
                className="max-h-64 rounded shadow border object-contain"
              />
            </div>
          )}
          {/* Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="mb-2">
                <span className="font-semibold">Author:</span> {content.author || 'N/A'}
              </div>
              <div className="mb-2">
                <span className="font-semibold">Publisher:</span> {content.publisher || 'N/A'}
              </div>
              <div className="mb-2">
                <span className="font-semibold">ISBN:</span> {content.isbn || 'N/A'}
              </div>
              <div className="mb-2">
                <span className="font-semibold">Language:</span> {content.language || 'N/A'}
              </div>
              <div className="mb-2">
                <span className="font-semibold">Content Type:</span> {content.content_type || 'N/A'}
              </div>
              <div className="mb-2">
                <span className="font-semibold">Category:</span> {content.category_id || 'N/A'}
              </div>
              <div className="mb-2">
                <span className="font-semibold">Page Count:</span> {content.page_count || 'N/A'}
              </div>
              <div className="mb-2">
                <span className="font-semibold">Version:</span> {content.version || '1.0'}
              </div>
            </div>
            <div>
              <div className="mb-2">
                <span className="font-semibold">Visibility:</span> <Badge variant="outline">{content.visibility || 'private'}</Badge>
              </div>
              <div className="mb-2">
                <span className="font-semibold">Status:</span> <Badge variant="outline">{content.status || 'draft'}</Badge>
              </div>
              <div className="mb-2">
                <span className="font-semibold">Price:</span> {content.price ? `$${content.price}` : 'Free'}
              </div>
              <div className="mb-2">
                <span className="font-semibold">Uploaded:</span> {content.created_at ? new Date(content.created_at).toLocaleString() : 'Unknown'}
              </div>
              <div className="mb-2">
                <span className="font-semibold">Last Updated:</span> {content.updated_at ? new Date(content.updated_at).toLocaleString() : 'Never'}
              </div>
              <div className="mb-2">
                <span className="font-semibold">Downloads:</span> {content.total_downloads || 0}
              </div>
              <div className="mb-2">
                <span className="font-semibold">Reviews:</span> {content.total_reviews || 0}
              </div>
            </div>
          </div>
          {/* Description */}
          <div>
            <div className="font-semibold mb-1">Description:</div>
            <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-line">
              {content.description || 'No description provided.'}
            </div>
          </div>
          {/* File Download */}
          {content.file_url && (
            <div className="mt-4">
              <Button asChild variant="outline">
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
