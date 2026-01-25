CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT audit_logs_action_check CHECK (
        action IN (
            'content_created',
            'content_updated',
            'content_deleted',
            'content_archived',
            'content_published',
            'content_unpublished',
            'file_uploaded',
            'file_deleted',
            'user_login',
            'user_logout',
            'permission_changed',
            'settings_updated',
            'order_created',
            'payment_processed',
            'refund_issued'
        )
    ),
    
    CONSTRAINT audit_logs_entity_type_check CHECK (
        entity_type IN (
            'content',
            'user',
            'order',
            'payment',
            'organization',
            'file',
            'settings'
        )
    )
);

-- Indexes for efficient audit log queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user 
    ON public.audit_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action 
    ON public.audit_logs(action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity 
    ON public.audit_logs(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created 
    ON public.audit_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Only admins and service role can view audit logs
CREATE POLICY "Admins can view all audit logs"
    ON public.audit_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Users can view their own audit logs
CREATE POLICY "Users can view their own audit logs"
    ON public.audit_logs
    FOR SELECT
    USING (auth.uid() = user_id);

-- Service role can insert audit logs
CREATE POLICY "Service role can insert audit logs"
    ON public.audit_logs
    FOR INSERT
    WITH CHECK (auth.jwt() ->> 'role' = 'service_role');