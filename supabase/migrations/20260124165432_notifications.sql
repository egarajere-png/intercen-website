-- Migration: Notifications Table
-- Supports content publishing notifications and general user notifications

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    content_id UUID REFERENCES content(id) ON DELETE CASCADE,
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT notifications_type_check CHECK (
        type IN (
            'content_published',
            'content_unpublished',
            'org_content_published',
            'content_approved',
            'content_rejected',
            'new_review',
            'new_follower',
            'purchase_confirmed',
            'system_announcement',
            'general'
        )
    )
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_notifications_user 
    ON public.notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_unread 
    ON public.notifications(user_id, read) 
    WHERE read = FALSE;

CREATE INDEX IF NOT EXISTS idx_notifications_content 
    ON public.notifications(content_id);

CREATE INDEX IF NOT EXISTS idx_notifications_type 
    ON public.notifications(type);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own notifications"
    ON public.notifications
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
    ON public.notifications
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert notifications"
    ON public.notifications
    FOR INSERT
    WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION public.mark_notification_read(notification_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.notifications
    SET 
        read = TRUE,
        read_at = NOW()
    WHERE 
        id = notification_id 
        AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read for a user
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS VOID AS $$
BEGIN
    UPDATE public.notifications
    SET 
        read = TRUE,
        read_at = NOW()
    WHERE 
        user_id = auth.uid() 
        AND read = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION public.get_unread_notification_count()
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM public.notifications
        WHERE user_id = auth.uid() AND read = FALSE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete old read notifications (cleanup)
CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete read notifications older than 90 days
    WITH deleted AS (
        DELETE FROM public.notifications
        WHERE 
            read = TRUE 
            AND read_at < NOW() - INTERVAL '90 days'
        RETURNING *
    )
    SELECT COUNT(*)::INTEGER INTO deleted_count FROM deleted;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE public.notifications IS 'User notifications for content publishing, reviews, and system events';
COMMENT ON FUNCTION public.mark_notification_read(UUID) IS 'Mark a single notification as read';
COMMENT ON FUNCTION public.mark_all_notifications_read() IS 'Mark all notifications as read for the current user';
COMMENT ON FUNCTION public.get_unread_notification_count() IS 'Get count of unread notifications for current user';
COMMENT ON FUNCTION public.cleanup_old_notifications() IS 'Delete read notifications older than 90 days';