import { useState } from 'react';
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
import { CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react';

interface ContentPublishButtonProps {
  contentId: string;
  currentStatus: string;
  onStatusChange?: (newStatus: string) => void;
  className?: string;
}

interface ValidationError {
  field: string;
  message: string;
}

export function ContentPublishButton({
  contentId,
  currentStatus,
  onStatusChange,
  className = '',
}: ContentPublishButtonProps) {
  const [loading, setLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<'publish' | 'unpublish' | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  const isPublished = currentStatus === 'published';

  const handleAction = async (action: 'publish' | 'unpublish') => {
    setLoading(true);
    setValidationErrors([]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('You must be logged in');
        return;
      }

      const supabaseUrl = 'https://nnljrawwhibazudjudht.supabase.co';
      
      const response = await fetch(`${supabaseUrl}/functions/v1/content-publish`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content_id: contentId,
          action,
          send_notification: true,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        // Handle validation errors
        if (result.validation_errors) {
          setValidationErrors(result.validation_errors);
          toast.error('Please fix the validation errors');
          return;
        }

        throw new Error(result.error || `Failed to ${action} content`);
      }

      toast.success(result.message);
      console.log('Action success:', result);

      // Call the callback to update parent component
      if (onStatusChange && result.content) {
        onStatusChange(result.content.status);
      }

    } catch (err: any) {
      console.error('Action failed:', err);
      toast.error(err.message || `Failed to ${action} content`);
    } finally {
      setLoading(false);
      setShowDialog(false);
      setPendingAction(null);
    }
  };

  const openDialog = (action: 'publish' | 'unpublish') => {
    setPendingAction(action);
    setShowDialog(true);
  };

  const confirmAction = () => {
    if (pendingAction) {
      handleAction(pendingAction);
    }
  };

  if (currentStatus === 'draft') {
    return (
      <>
        <Button
          onClick={() => openDialog('publish')}
          disabled={loading}
          variant="default"
          className={className}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Publishing...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Publish
            </>
          )}
        </Button>

        {/* Validation Errors Display */}
        {validationErrors.length > 0 && (
          <div className="mt-4 p-4 border border-red-200 bg-red-50 rounded-md">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-red-900 mb-2">
                  Please review and update the following to publish your content:
                </h4>
                <ul className="list-disc list-inside space-y-1">
                  {validationErrors.map((error, idx) => (
                    <li key={idx} className="text-sm text-red-800">
                      <strong>{error.field.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}:</strong> {error.message}
                    </li>
                  ))}
                </ul>
                <div className="text-xs text-red-700 mt-2">Once you fix these, you can try publishing again!</div>
              </div>
            </div>
          </div>
        )}

        <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Publish Content?</AlertDialogTitle>
              <AlertDialogDescription>
                This will make your content visible to the public. Make sure you have:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Added a cover image</li>
                  <li>Written a description (at least 50 characters)</li>
                  <li>Set a price (if selling)</li>
                  <li>Added stock quantity (if selling)</li>
                </ul>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmAction} disabled={loading}>
                {loading ? 'Publishing...' : 'Publish'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  if (currentStatus === 'published') {
    return (
      <>
        <Button
          onClick={() => openDialog('unpublish')}
          disabled={loading}
          variant="destructive"
          className={className}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Unpublishing...
            </>
          ) : (
            <>
              <XCircle className="h-4 w-4 mr-2" />
              Unpublish
            </>
          )}
        </Button>

        <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Unpublish Content?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove your content from public view and archive it. 
                It will also be removed from any featured sections.
                You can republish it later.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmAction} 
                disabled={loading}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {loading ? 'Unpublishing...' : 'Unpublish'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  if (currentStatus === 'archived') {
    return (
      <>
        <Button
          onClick={() => openDialog('publish')}
          disabled={loading}
          variant="outline"
          className={className}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Republishing...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Republish
            </>
          )}
        </Button>

        {validationErrors.length > 0 && (
          <div className="mt-4 p-4 border border-red-200 bg-red-50 rounded-md">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-red-900 mb-2">
                  Cannot republish - please fix these issues:
                </h4>
                <ul className="list-disc list-inside space-y-1">
                  {validationErrors.map((error, idx) => (
                    <li key={idx} className="text-sm text-red-800">
                      <strong>{error.field}:</strong> {error.message}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Republish Content?</AlertDialogTitle>
              <AlertDialogDescription>
                This will make your content visible to the public again.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmAction} disabled={loading}>
                {loading ? 'Publishing...' : 'Republish'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  // For pending_review or other statuses
  return (
    <Button disabled variant="outline" className={className}>
      Status: {currentStatus}
    </Button>
  );
}

// Added default export to fix the import error
export default ContentPublishButton;