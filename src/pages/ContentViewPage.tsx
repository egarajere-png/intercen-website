import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/SupabaseClient';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Layout } from '@/components/layout/Layout';
import { toast } from 'sonner';

const ContentViewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState(null);

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
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-lg font-semibold text-gray-600">Loading...</div>
        </div>
      </Layout>
    );
  }

  if (!content) {
    return null;
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              {content.title || 'Untitled Content'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              by {content.author || 'N/A'} | {content.content_type || 'N/A'} |{' '}
              <Badge variant="outline">{content.status || 'draft'}</Badge>
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => navigate(-1)}
              className="rounded-full px-6 py-2 font-semibold shadow-sm hover:bg-gray-100 transition"
            >
              Back
            </Button>
            <Button
              onClick={() => navigate(`/content/update/${content.id}`)}
              className="rounded-full px-6 py-2 font-semibold shadow-sm hover:bg-gray-100 transition"
            >
              Edit
            </Button>
          </div>
        </div>

        {/* Main Card Section */}
        <Card className="p-6 shadow-lg">
          {/* Cover Image */}
          {content.cover_image_url && (
            <div className="mb-6">
              <img
                src={content.cover_image_url}
                alt="Cover"
                className="w-full h-auto max-h-96 object-cover rounded-lg shadow-md"
              />
            </div>
          )}

          {/* Back Page Image (only if different from cover) */}
          {content.backpage_image_url && 
           content.backpage_image_url !== content.cover_image_url && (
            <div className="mb-6 bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Back Page Preview
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                A formal preview of the back page as seen in published content
              </p>
              <img
                src={content.backpage_image_url}
                alt="Back Page"
                className="w-full h-auto max-h-96 object-cover rounded-lg shadow-md"
              />
            </div>
          )}

          {/* Metadata Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-semibold text-gray-700">Publisher:</span>{' '}
              {content.publisher || 'N/A'}
            </div>
            <div>
              <span className="font-semibold text-gray-700">ISBN:</span>{' '}
              {content.isbn || 'N/A'}
            </div>
            <div>
              <span className="font-semibold text-gray-700">Language:</span>{' '}
              {content.language || 'N/A'}
            </div>
            <div>
              <span className="font-semibold text-gray-700">Content Type:</span>{' '}
              {content.content_type || 'N/A'}
            </div>
            <div>
              <span className="font-semibold text-gray-700">Category:</span>{' '}
              {content.category_id || 'N/A'}
            </div>
            <div>
              <span className="font-semibold text-gray-700">Page Count:</span>{' '}
              {content.page_count || 'N/A'}
            </div>
            <div>
              <span className="font-semibold text-gray-700">Version:</span>{' '}
              {content.version || '1.0'}
            </div>
            <div>
              <span className="font-semibold text-gray-700">Visibility:</span>{' '}
              {content.visibility || 'private'}
            </div>
            <div>
              <span className="font-semibold text-gray-700">Status:</span>{' '}
              <Badge variant="outline">{content.status || 'draft'}</Badge>
            </div>
            <div>
              <span className="font-semibold text-gray-700">Price:</span>{' '}
              {content.price ? `KSH ${content.price}` : 'Free'}
            </div>
            <div>
              <span className="font-semibold text-gray-700">Uploaded:</span>{' '}
              {content.created_at
                ? new Date(content.created_at).toLocaleString()
                : 'Unknown'}
            </div>
            <div>
              <span className="font-semibold text-gray-700">Last Updated:</span>{' '}
              {content.updated_at
                ? new Date(content.updated_at).toLocaleString()
                : 'Never'}
            </div>
            <div>
              <span className="font-semibold text-gray-700">Downloads:</span>{' '}
              {content.total_downloads || 0}
            </div>
            <div>
              <span className="font-semibold text-gray-700">Reviews:</span>{' '}
              {content.total_reviews || 0}
            </div>
          </div>

          {/* Description Section */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Description
            </h3>
            <p className="text-gray-700 leading-relaxed">
              {content.description || 'No description provided.'}
            </p>
          </div>

          {/* File Download */}
          {content.file_url && (
            <div className="mt-6">
              <Button
                onClick={() => window.open(content.file_url, '_blank')}
                className="w-full md:w-auto"
              >
                Download Content File
              </Button>
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
};

export default ContentViewPage;