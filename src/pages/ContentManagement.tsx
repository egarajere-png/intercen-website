import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/SupabaseClient';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Header } from '@/components/layout/Header';

const ContentManagementPage: React.FC = () => {
  const [userContents, setUserContents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserContents = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) throw new Error('Not authenticated');
        const { data, error } = await supabase
          .from('content')
          .select('*')
          .eq('uploaded_by', session.user.id)
          .order('created_at', { ascending: false });
        if (error) throw error;
        setUserContents(data || []);
      } catch (err) {
        toast({
          variant: 'destructive',
          title: 'Failed to load content',
          description: 'Could not fetch your uploaded content.',
        });
      } finally {
        setLoading(false);
      }
    };
    fetchUserContents();
    // eslint-disable-next-line
  }, []);

  return (
    <>
      <Header />
      <div className="container py-12 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="headline-1">My Uploaded Content</h1>
          <Button variant="outline" onClick={() => navigate(-1)}>Back to Profile</Button>
        </div>
        <Card className="p-6">
          {loading ? (
            <div className="text-muted-foreground">Loading...</div>
          ) : userContents.length === 0 ? (
            <div className="text-muted-foreground">You have not uploaded any content yet.</div>
          ) : (
            <ul className="divide-y divide-muted-foreground/10">
              {userContents.map((item) => (
                <li key={item.id} className="py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <span className="font-medium text-primary">{item.title || 'Untitled Content'}</span>
                    <div className="text-sm text-muted-foreground">{item.description?.slice(0, 100) || 'No description.'}</div>
                    <div className="text-xs text-muted-foreground">Uploaded: {item.created_at ? new Date(item.created_at).toLocaleString() : 'Unknown'}</div>
                  </div>
                  <div className="flex gap-2 mt-2 md:mt-0">
                    <Button size="sm" variant="outline" onClick={() => navigate(`/content/update/${item.id}`)}>Update</Button>
                    <Button size="sm" variant="outline" onClick={() => navigate(`/content/delete/${item.id}`)}>Delete</Button>
                    <Button size="sm" variant="outline" onClick={() => navigate(`/content/${item.id}`)}>View</Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
};

export default ContentManagementPage;
