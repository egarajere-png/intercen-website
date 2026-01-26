import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { supabase } from '@/lib/SupabaseClient';
import { Trash2, Loader2, AlertTriangle } from 'lucide-react';

interface ContentDeleteButtonProps {
  contentId: string;
  contentTitle: string;
  onDeleted?: () => void;
  redirectOnDelete?: string; // URL to redirect after successful deletion
  className?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

interface DeleteResult {
  action: 'deleted' | 'archived';
  message: string;
  metadata?: {
    has_purchases?: boolean;
    purchase_count?: number;
    storage_errors?: string[];
  };
}

export function ContentDeleteButton({
  contentId,
  contentTitle,
  onDeleted,
  redirectOnDelete,
  className = '',
  variant = 'destructive',
  size = 'default',
}: ContentDeleteButtonProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [deleteResult, setDeleteResult] = useState<DeleteResult | null>(null);

  const handleDelete = async () => {
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('You must be logged in');
        return;
      }

      const supabaseUrl = 'https://nnljrawwhibazudjudht.supabase.co';
      
      const response = await fetch(`${supabaseUrl}/functions/v1/content-delete`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content_id: contentId,
          force_delete: false, // Regular users cannot force delete
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete content');
      }

      setDeleteResult(result);

      // Show appropriate toast based on action
      if (result.action === 'deleted') {
        toast.success(result.message || 'Content deleted successfully');
      } else if (result.action === 'archived') {
        toast.warning(result.message || 'Content archived (has existing purchases)');
      }

      console.log('Delete/Archive success:', result);

      // Call the callback
      if (onDeleted) {
        onDeleted();
      }

      // Redirect if specified
      if (redirectOnDelete) {
        setTimeout(() => {
          navigate(redirectOnDelete);
        }, 1500);
      }

    } catch (err: any) {
      console.error('Delete failed:', err);
      toast.error(err.message || 'Failed to delete content');
    } finally {
      setLoading(false);
      setShowDialog(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setShowDialog(true)}
        disabled={loading}
        variant={variant}
        size={size}
        className={className}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Deleting...
          </>
        ) : (
          <>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </>
        )}
      </Button>

      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Content?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Are you sure you want to delete <strong>"{contentTitle}"</strong>?
              </p>
              
              <div className="bg-amber-50 border border-amber-200 rounded-md p-3 space-y-2">
                <p className="font-medium text-amber-900">This will:</p>
                <ul className="list-disc list-inside text-sm text-amber-800 space-y-1">
                  <li>Permanently remove the content from the database</li>
                  <li>Delete associated files from storage</li>
                  <li>Remove from all shopping carts</li>
                  <li>Delete all reviews and ratings</li>
                  <li>Delete version history</li>
                </ul>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> If this content has been purchased by users, 
                  it will be <strong>archived</strong> instead of deleted to preserve order history.
                </p>
              </div>

              <p className="text-destructive font-medium">
                This action cannot be undone!
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? 'Deleting...' : 'Yes, Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Variant: Icon-only delete button
export function ContentDeleteIconButton({
  contentId,
  contentTitle,
  onDeleted,
  redirectOnDelete,
  className = '',
}: Omit<ContentDeleteButtonProps, 'variant' | 'size'>) {
  return (
    <ContentDeleteButton
      contentId={contentId}
      contentTitle={contentTitle}
      onDeleted={onDeleted}
      redirectOnDelete={redirectOnDelete}
      className={className}
      variant="ghost"
      size="icon"
    />
  );
}