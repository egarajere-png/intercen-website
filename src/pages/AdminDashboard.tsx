import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/SupabaseClient';
import { useRole } from '@/contexts/RoleContext';
import { useToast } from '@/hooks/use-toast';
import { Seo } from '@/components/Seo';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users, BookOpen, FileText, ShoppingCart,
  CheckCircle, XCircle, Clock, Shield, Edit3, Eye,
  Upload, AlertCircle, Search, RefreshCw,
  LogOut, Save, Camera, User, Trash2, Globe, EyeOff,
  ChevronDown, ChevronUp, Star, Grid3X3, List, Plus,
  StickyNote, BookMarked, Rocket,
} from 'lucide-react';

// ── Constants ────────────────────────────────────────────────────────────────

const ADMIN_IDS = [
  '5fbc35df-ae08-4f8a-b0b3-dd6bb4610ebd',
  'e2925b0b-c730-484c-b4f1-1361380bccd3',
];

const ROLES = ['reader', 'author', 'publisher', 'editor', 'moderator', 'admin', 'corporate_user'];

const ROLE_COLORS: Record<string, string> = {
  admin:          'bg-red-100 text-red-700 border-red-200',
  author:         'bg-blue-100 text-blue-700 border-blue-200',
  publisher:      'bg-purple-100 text-purple-700 border-purple-200',
  editor:         'bg-amber-100 text-amber-700 border-amber-200',
  moderator:      'bg-green-100 text-green-700 border-green-200',
  reader:         'bg-gray-100 text-gray-600 border-gray-200',
  corporate_user: 'bg-indigo-100 text-indigo-700 border-indigo-200',
};

const ORDER_STATUSES   = ['pending', 'processing', 'shipped', 'delivered', 'completed', 'cancelled'] as const;
const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded'] as const;
const CONTENT_TYPES    = ['book', 'ebook', 'document', 'paper', 'report', 'manual', 'guide'] as const;

const ORDER_STATUS_COLORS: Record<string, string> = {
  pending:    'bg-amber-50 text-amber-700 border-amber-200',
  processing: 'bg-blue-50 text-blue-700 border-blue-200',
  shipped:    'bg-purple-50 text-purple-700 border-purple-200',
  delivered:  'bg-teal-50 text-teal-700 border-teal-200',
  completed:  'bg-green-50 text-green-700 border-green-200',
  cancelled:  'bg-red-50 text-red-700 border-red-200',
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  pending:  'text-amber-600',
  paid:     'text-green-600',
  failed:   'text-red-600',
  refunded: 'text-gray-500',
};

const CONTENT_STATUS_COLORS: Record<string, string> = {
  published:      'bg-green-50 text-green-700 border-green-200',
  draft:          'bg-gray-100 text-gray-600 border-gray-200',
  archived:       'bg-red-50 text-red-600 border-red-200',
  pending_review: 'bg-amber-50 text-amber-700 border-amber-200',
  discontinued:   'bg-gray-200 text-gray-500 border-gray-300',
};

const MAX_BIO    = 500;
const MAX_NAME   = 100;
const MAX_AVATAR = 5 * 1024 * 1024;

// ── Component ────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const { userId, role } = useRole();
  const navigate         = useNavigate();
  const { toast }        = useToast();
  const fileRef          = React.useRef<HTMLInputElement>(null);

  // ── profile ──────────────────────────────────────────────────────────────
  const [adminProfile,  setAdminProfile]  = useState<any>(null);
  const [loading,       setLoading]       = useState(true);
  const [fullName,      setFullName]      = useState('');
  const [bio,           setBio]           = useState('');
  const [phone,         setPhone]         = useState('');
  const [address,       setAddress]       = useState('');
  const [organization,  setOrganization]  = useState('');
  const [department,    setDepartment]    = useState('');
  const [avatarUrl,     setAvatarUrl]     = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarBase64,  setAvatarBase64]  = useState<string | null>(null);
  const [saving,        setSaving]        = useState(false);

  // ── users ─────────────────────────────────────────────────────────────────
  const [users,         setUsers]         = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [userSearch,    setUserSearch]    = useState('');
  const [savingRole,    setSavingRole]    = useState<string | null>(null);

  // ── publications ──────────────────────────────────────────────────────────
  const [publications,       setPublications]       = useState<any[]>([]);
  const [pubStatusFilter,    setPubStatusFilter]    = useState<string>('all');
  const [activePublication,  setActivePublication]  = useState<any>(null);
  const [rejectionFeedback,  setRejectionFeedback]  = useState('');
  const [processingPub,      setProcessingPub]      = useState(false);
  const [deletingPub,        setDeletingPub]        = useState<string | null>(null);
  const [publishingAsContent,setPublishingAsContent]= useState<string | null>(null);
  const [editingNotesPub,    setEditingNotesPub]    = useState<string | null>(null);
  const [adminNotesInput,    setAdminNotesInput]    = useState('');
  const [savingNotes,        setSavingNotes]        = useState(false);

  // ── content ───────────────────────────────────────────────────────────────
  const [contentItems,        setContentItems]        = useState<any[]>([]);
  const [contentLoading,      setContentLoading]      = useState(false);
  const [contentSearch,       setContentSearch]       = useState('');
  const [contentStatusFilter, setContentStatusFilter] = useState('all');
  const [contentTypeFilter,   setContentTypeFilter]   = useState('all');
  const [contentViewMode,     setContentViewMode]     = useState<'grid' | 'list'>('grid');
  const [publishingContent,   setPublishingContent]   = useState<string | null>(null);
  const [deletingContent,     setDeletingContent]     = useState<string | null>(null);

  // ── orders ────────────────────────────────────────────────────────────────
  const [orders,             setOrders]             = useState<any[]>([]);
  const [ordersLoading,      setOrdersLoading]      = useState(false);
  const [orderStatusFilter,  setOrderStatusFilter]  = useState('all');
  const [orderPaymentFilter, setOrderPaymentFilter] = useState('all');
  const [orderSearch,        setOrderSearch]        = useState('');
  const [expandedOrder,      setExpandedOrder]      = useState<string | null>(null);
  const [orderItemsMap,      setOrderItemsMap]      = useState<Record<string, any[]>>({});
  const [updatingOrder,      setUpdatingOrder]      = useState<string | null>(null);
  const [deletingOrder,      setDeletingOrder]      = useState<string | null>(null);
  const [selectedOrders,     setSelectedOrders]     = useState<string[]>([]);
  const [orderNotes,         setOrderNotes]         = useState<Record<string, string>>({});

  // ── init ──────────────────────────────────────────────────────────────────

  useEffect(() => { if (userId) loadAll(); }, [userId]);

  useEffect(() => {
    const q = userSearch.toLowerCase();
    setFilteredUsers(q
      ? users.filter(u =>
          (u.full_name || '').toLowerCase().includes(q) ||
          (u.email     || '').toLowerCase().includes(q) ||
          (u.role      || '').toLowerCase().includes(q))
      : users);
  }, [userSearch, users]);

  useEffect(() => { loadContent(); }, [contentStatusFilter, contentTypeFilter]);
  useEffect(() => { loadOrders();  }, [orderStatusFilter, orderPaymentFilter]);

  // ── loaders ───────────────────────────────────────────────────────────────

  const loadAll = async () => {
    setLoading(true);
    try {
      const [profileRes, usersRes, pubRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),

        // ✅ FIX: Use publication_requests_view instead of joining profiles!submitted_by
        // The view already exposes submitted_by_email and reviewed_by_email
        supabase
          .from('publication_requests_view')
          .select('*')
          .order('created_at', { ascending: false }),
      ]);

      const p = profileRes.data;
      setAdminProfile(p);
      setFullName(p?.full_name     || '');
      setBio(p?.bio                || '');
      setPhone(p?.phone            || '');
      setAddress(p?.address        || '');
      setOrganization(p?.organization || '');
      setDepartment(p?.department  || '');
      setAvatarUrl(p?.avatar_url   || '');

      setUsers(usersRes.data || []);
      setFilteredUsers(usersRes.data || []);
      setPublications(pubRes.data   || []);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Load failed', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const loadContent = async () => {
    setContentLoading(true);
    let q = supabase
      .from('content')
      .select(
        'id, title, subtitle, author, content_type, status, cover_image_url, ' +
        'price, is_free, is_featured, is_for_sale, language, visibility, ' +
        'average_rating, total_reviews, view_count, total_downloads, created_at, updated_at, published_at'
      )
      .order('created_at', { ascending: false })
      .limit(200);

    if (contentStatusFilter !== 'all') q = q.eq('status', contentStatusFilter);
    if (contentTypeFilter   !== 'all') q = q.eq('content_type', contentTypeFilter);

    const { data, error } = await q;
    if (error) toast({ variant: 'destructive', title: 'Failed to load content', description: error.message });
    else setContentItems(data || []);
    setContentLoading(false);
  };

  // ✅ FIX: loadPublications also uses publication_requests_view
  const loadPublications = async () => {
    const { data, error } = await supabase
      .from('publication_requests_view')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setPublications(data);
    else if (error) toast({ variant: 'destructive', title: 'Failed to reload submissions', description: error.message });
  };

  const loadOrders = async () => {
    setOrdersLoading(true);
    let q = supabase
      .from('orders')
      .select('*, customer:profiles(full_name, email, avatar_url)')
      .order('created_at', { ascending: false })
      .limit(150);

    if (orderStatusFilter  !== 'all') q = q.eq('status',         orderStatusFilter);
    if (orderPaymentFilter !== 'all') q = q.eq('payment_status', orderPaymentFilter);

    const { data, error } = await q;
    if (error) toast({ variant: 'destructive', title: 'Failed to load orders', description: error.message });
    else setOrders(data || []);
    setOrdersLoading(false);
  };

  const loadOrderItems = async (orderId: string) => {
    if (orderItemsMap[orderId]) return;
    const { data } = await supabase
      .from('order_items')
      .select('*, content(title, cover_image_url, content_type)')
      .eq('order_id', orderId);
    if (data) setOrderItemsMap(prev => ({ ...prev, [orderId]: data }));
  };

  // ── content actions ───────────────────────────────────────────────────────

  const handlePublishContent = async (contentId: string, action: 'publish' | 'unpublish') => {
    setPublishingContent(contentId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/content-publish`,
        {
          method: 'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
            'apikey':         import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ content_id: contentId, action }),
        }
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed');
      const newStatus = action === 'publish' ? 'published' : 'archived';
      setContentItems(prev => prev.map(c => c.id === contentId ? { ...c, status: newStatus } : c));
      toast({ title: action === 'publish' ? 'Content published' : 'Content unpublished' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed', description: err.message });
    } finally {
      setPublishingContent(null);
    }
  };

  const handleDeleteContent = async (contentId: string, title: string) => {
    if (!window.confirm(`Delete "${title}"?\n\nThis cannot be undone. Items with existing orders will be archived instead.`)) return;
    setDeletingContent(contentId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/content-delete`,
        {
          method: 'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
            'apikey':         import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ content_id: contentId }),
        }
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed');
      if (result.action === 'deleted') {
        setContentItems(prev => prev.filter(c => c.id !== contentId));
        toast({ title: 'Content deleted permanently' });
      } else {
        setContentItems(prev => prev.map(c => c.id === contentId ? { ...c, status: 'archived' } : c));
        toast({ title: 'Content archived', description: 'Item has existing purchases and was archived rather than deleted.' });
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Delete failed', description: err.message });
    } finally {
      setDeletingContent(null);
    }
  };

  const handleToggleFeatured = async (contentId: string, current: boolean) => {
    const { error } = await supabase
      .from('content')
      .update({ is_featured: !current, updated_at: new Date().toISOString() })
      .eq('id', contentId);
    if (error) return toast({ variant: 'destructive', title: 'Failed', description: error.message });
    setContentItems(prev => prev.map(c => c.id === contentId ? { ...c, is_featured: !current } : c));
    toast({ title: !current ? 'Marked as featured' : 'Removed from featured' });
  };

  // ── order actions ─────────────────────────────────────────────────────────

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setUpdatingOrder(orderId);
    const updates: any = { status: newStatus, updated_at: new Date().toISOString() };
    if (newStatus === 'completed') updates.completed_at = new Date().toISOString();
    if (newStatus === 'cancelled') updates.cancelled_at = new Date().toISOString();

    const { error } = await supabase.from('orders').update(updates).eq('id', orderId);
    if (error) {
      toast({ variant: 'destructive', title: 'Update failed', description: error.message });
    } else {
      const order = orders.find(o => o.id === orderId);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updates } : o));
      if (order?.user_id) {
        await supabase.from('notifications').insert({
          user_id: order.user_id,
          type:    'order_update',
          title:   'Order Status Updated',
          message: `Your order ${order.order_number} has been updated to "${newStatus}".`,
        });
      }
      toast({ title: 'Order updated', description: `Status → ${newStatus}` });
    }
    setUpdatingOrder(null);
  };

  const updatePaymentStatus = async (orderId: string, newPayment: string) => {
    setUpdatingOrder(orderId);
    const updates: any = { payment_status: newPayment, updated_at: new Date().toISOString() };
    if (newPayment === 'paid') updates.paid_at = new Date().toISOString();

    const { error } = await supabase.from('orders').update(updates).eq('id', orderId);
    if (error) {
      toast({ variant: 'destructive', title: 'Update failed', description: error.message });
    } else {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updates } : o));
      toast({ title: 'Payment status updated', description: `→ ${newPayment}` });
    }
    setUpdatingOrder(null);
  };

  const deleteOrder = async (orderId: string, orderNumber: string) => {
    if (!window.confirm(`Permanently delete order #${orderNumber}?\n\nThis action cannot be undone.`)) return;
    setDeletingOrder(orderId);
    const { error } = await supabase.from('orders').delete().eq('id', orderId);
    if (error) {
      toast({ variant: 'destructive', title: 'Delete failed', description: error.message });
    } else {
      setOrders(prev => prev.filter(o => o.id !== orderId));
      setSelectedOrders(prev => prev.filter(id => id !== orderId));
      toast({ title: `Order #${orderNumber} deleted` });
    }
    setDeletingOrder(null);
  };

  const saveOrderNote = async (orderId: string) => {
    const note = orderNotes[orderId];
    if (note === undefined) return;
    const { error } = await supabase
      .from('orders')
      .update({ notes: note, updated_at: new Date().toISOString() })
      .eq('id', orderId);
    if (error) toast({ variant: 'destructive', title: 'Failed to save note', description: error.message });
    else {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, notes: note } : o));
      toast({ title: 'Note saved' });
    }
  };

  const bulkUpdateOrderStatus = async (newStatus: string) => {
    if (!selectedOrders.length) return;
    const updates: any = { status: newStatus, updated_at: new Date().toISOString() };
    if (newStatus === 'completed') updates.completed_at = new Date().toISOString();
    if (newStatus === 'cancelled') updates.cancelled_at = new Date().toISOString();

    const { error } = await supabase.from('orders').update(updates).in('id', selectedOrders);
    if (error) {
      toast({ variant: 'destructive', title: 'Bulk update failed', description: error.message });
    } else {
      setOrders(prev => prev.map(o => selectedOrders.includes(o.id) ? { ...o, ...updates } : o));
      toast({ title: `${selectedOrders.length} orders updated to "${newStatus}"` });
      setSelectedOrders([]);
    }
  };

  const bulkDeleteOrders = async () => {
    if (!selectedOrders.length) return;
    if (!window.confirm(`Permanently delete ${selectedOrders.length} selected orders?\n\nThis cannot be undone.`)) return;
    const { error } = await supabase.from('orders').delete().in('id', selectedOrders);
    if (error) {
      toast({ variant: 'destructive', title: 'Bulk delete failed', description: error.message });
    } else {
      setOrders(prev => prev.filter(o => !selectedOrders.includes(o.id)));
      toast({ title: `${selectedOrders.length} orders deleted` });
      setSelectedOrders([]);
    }
  };

  // ── publication actions ───────────────────────────────────────────────────

  const handlePubAction = async (pubId: string, action: 'approved' | 'rejected' | 'under_review') => {
    setProcessingPub(true);
    try {
      const updates: any = { status: action, reviewed_by: userId, reviewed_at: new Date().toISOString() };
      if (action === 'rejected') updates.rejection_feedback = rejectionFeedback;
      const { error } = await supabase.from('publications').update(updates).eq('id', pubId);
      if (error) throw error;

      // ✅ FIX: pub now comes from publication_requests_view — use submitted_by_email
      // The view exposes `submitted_by` as the UUID (from publications.submitted_by)
      const pub = publications.find(p => p.id === pubId);
      if (pub?.submitted_by) {
        const msgs: Record<string, string> = {
          approved:     `Your manuscript "${pub.title}" has been approved!`,
          rejected:     `Your manuscript "${pub.title}" was not approved.${rejectionFeedback ? ' Feedback: ' + rejectionFeedback : ''}`,
          under_review: `Your manuscript "${pub.title}" is now under review.`,
        };
        await supabase.from('notifications').insert({
          user_id: pub.submitted_by,
          type:    action === 'approved' ? 'content_approved' : action === 'rejected' ? 'content_rejected' : 'general',
          title:   action === 'approved' ? 'Manuscript Approved!' : action === 'rejected' ? 'Submission Decision' : 'Under Review',
          message: msgs[action],
        });
      }
      setPublications(prev => prev.map(p => p.id === pubId ? { ...p, ...updates } : p));
      setActivePublication(null);
      setRejectionFeedback('');
      toast({ title: 'Updated', description: `Publication marked as ${action.replace('_', ' ')}.` });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed', description: err.message });
    } finally {
      setProcessingPub(false);
    }
  };

  const deletePublication = async (pubId: string, title: string) => {
    if (!window.confirm(`Delete submission "${title}"?\n\nThis will permanently remove the manuscript submission record.`)) return;
    setDeletingPub(pubId);
    const { error } = await supabase.from('publications').delete().eq('id', pubId);
    if (error) {
      toast({ variant: 'destructive', title: 'Delete failed', description: error.message });
    } else {
      setPublications(prev => prev.filter(p => p.id !== pubId));
      toast({ title: 'Submission deleted' });
    }
    setDeletingPub(null);
  };

  const saveAdminNotes = async (pubId: string) => {
    setSavingNotes(true);
    const { error } = await supabase
      .from('publications')
      .update({ admin_notes: adminNotesInput, updated_at: new Date().toISOString() })
      .eq('id', pubId);
    if (error) {
      toast({ variant: 'destructive', title: 'Failed to save notes', description: error.message });
    } else {
      setPublications(prev => prev.map(p => p.id === pubId ? { ...p, admin_notes: adminNotesInput } : p));
      setEditingNotesPub(null);
      setAdminNotesInput('');
      toast({ title: 'Admin notes saved' });
    }
    setSavingNotes(false);
  };

  const publishManuscriptAsContent = async (pub: any) => {
    if (!window.confirm(`Publish "${pub.title}" as live content?\n\nThis will create a published content record and notify the author by email.`)) return;
    setPublishingAsContent(pub.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/publication-publish`,
        {
          method: 'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
            'apikey':         import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ publication_id: pub.id }),
        }
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to publish');
      toast({
        title: '🎉 Manuscript published!',
        description: result.email_sent
          ? `"${pub.title}" is now live. Author notified by email.`
          : `"${pub.title}" is now live. In-app notification sent.`,
      });
      loadContent();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Publish failed', description: err.message });
    } finally {
      setPublishingAsContent(null);
    }
  };

  // ── user actions ──────────────────────────────────────────────────────────

  const changeUserRole = async (targetId: string, newRole: string) => {
    if (ADMIN_IDS.includes(targetId) && newRole !== 'admin') {
      toast({ variant: 'destructive', title: 'Protected', description: 'Default admin roles cannot be changed.' });
      return;
    }
    setSavingRole(targetId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('id', targetId);
      if (error) throw error;
      setUsers(prev => prev.map(u => u.id === targetId ? { ...u, role: newRole } : u));
      await supabase.from('notifications').insert({
        user_id: targetId,
        type:    'general',
        title:   'Your role has been updated',
        message: `An admin changed your role to "${newRole}".`,
      });
      toast({ title: 'Role updated' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed', description: err.message });
    } finally {
      setSavingRole(null);
    }
  };

  const toggleActive = async (targetId: string, current: boolean) => {
    if (ADMIN_IDS.includes(targetId)) {
      toast({ variant: 'destructive', title: 'Protected', description: 'Default admins cannot be deactivated.' });
      return;
    }
    const { error } = await supabase.from('profiles').update({ is_active: !current }).eq('id', targetId);
    if (!error) setUsers(prev => prev.map(u => u.id === targetId ? { ...u, is_active: !current } : u));
  };

  // ── profile actions ───────────────────────────────────────────────────────

  const handleAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > MAX_AVATAR) {
      toast({ variant: 'destructive', title: 'Invalid file', description: 'Image must be ≤ 5 MB' });
      return;
    }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      setAvatarBase64(reader.result as string);
      setAvatarPreview(URL.createObjectURL(file));
    };
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');
      const payload: any = {
        full_name:    fullName.trim()     || undefined,
        bio:          bio.trim()          || undefined,
        phone:        phone.trim()        || undefined,
        address:      address.trim()      || undefined,
        organization: organization.trim() || undefined,
        department:   department.trim()   || undefined,
      };
      if (avatarBase64) payload.avatar_base64 = avatarBase64;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/profile-info-edit`,
        {
          method:  'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey':         import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || 'Failed');
      }
      const { data: fresh } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
      setAdminProfile(fresh);
      setAvatarUrl(fresh?.avatar_url || '');
      setAvatarBase64(null);
      setAvatarPreview(null);
      toast({ title: 'Profile saved', description: 'Your details have been updated.' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Save failed', description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => { await supabase.auth.signOut(); navigate('/auth'); };

  // ── derived ───────────────────────────────────────────────────────────────

  const pendingPubs = publications.filter(p => p.status === 'pending');

  const filteredContent = contentItems.filter(c => {
    if (!contentSearch) return true;
    const q = contentSearch.toLowerCase();
    return (
      (c.title        || '').toLowerCase().includes(q) ||
      (c.author       || '').toLowerCase().includes(q) ||
      (c.content_type || '').toLowerCase().includes(q) ||
      (c.language     || '').toLowerCase().includes(q)
    );
  });

  const filteredOrders = orders.filter(o => {
    if (!orderSearch) return true;
    const q = orderSearch.toLowerCase();
    return (
      (o.order_number              || '').toLowerCase().includes(q) ||
      (o.customer?.full_name       || '').toLowerCase().includes(q) ||
      (o.customer?.email           || '').toLowerCase().includes(q) ||
      (o.payment_reference         || '').toLowerCase().includes(q) ||
      (o.status                    || '').toLowerCase().includes(q) ||
      (o.payment_status            || '').toLowerCase().includes(q) ||
      (o.payment_method            || '').toLowerCase().includes(q) ||
      (o.notes                     || '').toLowerCase().includes(q) ||
      (o.shipping_address          || '').toLowerCase().includes(q) ||
      (o.billing_address           || '').toLowerCase().includes(q) ||
      String(o.total_price         || '').includes(q) ||
      String(o.order_number        || '').includes(q)
    );
  });

  // ── loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            <p className="text-sm text-muted-foreground">Loading dashboard…</p>
          </div>
        </div>
      </div>
    );
  }

  // ── inline sub-components ─────────────────────────────────────────────────

  const ContentGridCard = ({ item }: { item: any }) => (
    <div className="group relative rounded-xl overflow-hidden border bg-card shadow-sm hover:shadow-md transition-all duration-200">
      <div className="relative aspect-[3/4] bg-muted overflow-hidden">
        {item.cover_image_url ? (
          <img
            src={item.cover_image_url}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 to-muted gap-2">
            <BookOpen className="h-10 w-10 text-primary/30" />
            <span className="text-[10px] text-muted-foreground capitalize">{item.content_type}</span>
          </div>
        )}
        <div className="absolute top-2 left-2">
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${CONTENT_STATUS_COLORS[item.status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
            {item.status?.replace('_', ' ')}
          </span>
        </div>
        {item.is_featured && (
          <div className="absolute top-2 right-2">
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700 border border-amber-200 flex items-center gap-0.5">
              <Star className="h-2.5 w-2.5 fill-amber-500" />
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-black/72 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
          <div className="flex gap-1.5 flex-wrap justify-center px-3">
            <button onClick={() => navigate(`/content/${item.id}`)}
              className="p-2 bg-white/15 hover:bg-white/30 rounded-lg text-white transition-colors" title="View">
              <Eye className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => navigate(`/content/update/${item.id}`)}
              className="p-2 bg-white/15 hover:bg-white/30 rounded-lg text-white transition-colors" title="Edit">
              <Edit3 className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => handleToggleFeatured(item.id, item.is_featured)}
              className={`p-2 rounded-lg text-white transition-colors ${item.is_featured ? 'bg-amber-500/60 hover:bg-amber-500/80' : 'bg-white/15 hover:bg-white/30'}`}
              title={item.is_featured ? 'Remove featured' : 'Mark featured'}>
              <Star className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => handlePublishContent(item.id, item.status === 'published' ? 'unpublish' : 'publish')}
              disabled={publishingContent === item.id}
              className={`p-2 rounded-lg text-white transition-colors disabled:opacity-50 ${
                item.status === 'published' ? 'bg-orange-500/60 hover:bg-orange-500/80' : 'bg-green-500/60 hover:bg-green-500/80'
              }`}
              title={item.status === 'published' ? 'Unpublish' : 'Publish'}
            >
              {publishingContent === item.id
                ? <div className="h-3.5 w-3.5 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
                : item.status === 'published' ? <EyeOff className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />
              }
            </button>
            <button
              onClick={() => handleDeleteContent(item.id, item.title)}
              disabled={deletingContent === item.id}
              className="p-2 bg-red-500/60 hover:bg-red-500/80 rounded-lg text-white transition-colors disabled:opacity-50"
              title="Delete"
            >
              {deletingContent === item.id
                ? <div className="h-3.5 w-3.5 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
                : <Trash2 className="h-3.5 w-3.5" />
              }
            </button>
          </div>
        </div>
      </div>
      <div className="p-3">
        <h4 className="font-medium text-sm line-clamp-1">{item.title}</h4>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.author || '—'}</p>
        <div className="flex items-center justify-between mt-2">
          <span className="text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded capitalize">{item.content_type}</span>
          <span className="text-sm font-semibold">
            {item.is_free
              ? <span className="text-green-600 text-xs font-medium">Free</span>
              : `KES ${parseFloat(item.price || 0).toLocaleString()}`
            }
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
          {item.view_count > 0 && <span>{item.view_count.toLocaleString()} views</span>}
          {item.total_downloads > 0 && <span>· {item.total_downloads.toLocaleString()} dl</span>}
        </div>
      </div>
    </div>
  );

  const ContentListRow = ({ item }: { item: any }) => (
    <tr className="hover:bg-muted/20 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          {item.cover_image_url ? (
            <img src={item.cover_image_url} alt="" className="h-10 w-8 object-cover rounded border flex-shrink-0" />
          ) : (
            <div className="h-10 w-8 bg-muted rounded border flex items-center justify-center flex-shrink-0">
              <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0">
            <div className="font-medium text-sm truncate max-w-[220px]">{item.title}</div>
            <div className="text-xs text-muted-foreground truncate max-w-[220px]">{item.author || '—'}</div>
          </div>
          {item.is_featured && <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-400 flex-shrink-0" />}
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="text-xs capitalize bg-muted px-2 py-0.5 rounded text-muted-foreground">{item.content_type}</span>
      </td>
      <td className="px-4 py-3">
        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${CONTENT_STATUS_COLORS[item.status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
          {item.status?.replace('_', ' ')}
        </span>
      </td>
      <td className="px-4 py-3 text-sm font-medium">
        {item.is_free
          ? <span className="text-green-600 text-xs font-medium">Free</span>
          : `KES ${parseFloat(item.price || 0).toLocaleString()}`
        }
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground">
        {(item.view_count || 0).toLocaleString()}
        {item.total_downloads > 0 && <span className="ml-1 opacity-60">/ {item.total_downloads.toLocaleString()} dl</span>}
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(item.created_at).toLocaleDateString()}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-0.5">
          <button onClick={() => navigate(`/content/${item.id}`)}
            className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-primary transition-colors" title="View">
            <Eye className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => navigate(`/content/update/${item.id}`)}
            className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-primary transition-colors" title="Edit">
            <Edit3 className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => handleToggleFeatured(item.id, item.is_featured)}
            className={`p-1.5 hover:bg-muted rounded transition-colors ${item.is_featured ? 'text-amber-500' : 'text-muted-foreground hover:text-amber-500'}`}
            title={item.is_featured ? 'Remove featured' : 'Feature'}>
            <Star className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => handlePublishContent(item.id, item.status === 'published' ? 'unpublish' : 'publish')}
            disabled={publishingContent === item.id}
            className={`p-1.5 hover:bg-muted rounded transition-colors disabled:opacity-40 ${
              item.status === 'published' ? 'text-orange-500 hover:text-orange-600' : 'text-muted-foreground hover:text-green-600'
            }`}
            title={item.status === 'published' ? 'Unpublish' : 'Publish'}
          >
            {item.status === 'published' ? <EyeOff className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={() => handleDeleteContent(item.id, item.title)}
            disabled={deletingContent === item.id}
            className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40"
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <>
      <Seo title="Admin Dashboard | Intercen Books" description="Intercen Books administration panel." />
      <div className="min-h-screen bg-background">
        <Header />

        {/* Hero banner */}
        <div className="bg-charcoal text-white border-b border-white/5">
          <div className="container max-w-7xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <div className="relative">
                  {(avatarPreview || avatarUrl) ? (
                    <img src={avatarPreview || avatarUrl} alt="" className="h-14 w-14 rounded-full object-cover border-2 border-primary/40" />
                  ) : (
                    <div className="h-14 w-14 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center font-forum text-xl text-primary">
                      {(adminProfile?.full_name || 'A')[0].toUpperCase()}
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-red-500 border-2 border-charcoal flex items-center justify-center">
                    <Shield className="h-2 w-2 text-white" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <h1 className="font-forum text-lg font-bold">{adminProfile?.full_name || 'Administrator'}</h1>
                    <span className="text-[10px] bg-red-500/20 border border-red-500/30 text-red-300 px-2 py-0.5 rounded-full font-medium tracking-wide">ADMIN</span>
                  </div>
                  <p className="text-white/50 text-xs">{adminProfile?.email || 'Administration Panel'} · Intercen Books</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button size="sm" variant="outline"
                  className="border-white/20 text-white/80 hover:bg-white/10 gap-2 text-xs h-8"
                  onClick={() => navigate('/upload')}>
                  <Upload className="h-3.5 w-3.5" /> Upload Content
                </Button>
                <Button size="sm" variant="outline"
                  className="border-white/20 text-white/80 hover:bg-white/10 gap-2 text-xs h-8"
                  onClick={() => navigate('/content-management')}>
                  <BookOpen className="h-3.5 w-3.5" /> Content Manager
                </Button>
                <Button size="sm" variant="ghost"
                  className="text-white/50 hover:text-white gap-2 text-xs h-8"
                  onClick={handleSignOut}>
                  <LogOut className="h-3.5 w-3.5" /> Sign Out
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="container max-w-7xl mx-auto px-4 py-8">

          {/* Pending submissions alert */}
          {pendingPubs.length > 0 && (
            <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
              <span className="font-medium text-amber-800 flex-1 text-sm">
                {pendingPubs.length} manuscript{pendingPubs.length !== 1 ? 's' : ''} awaiting editorial review
              </span>
              <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-8"
                onClick={() => (document.querySelector('[value="publications"]') as HTMLElement)?.click()}>
                Review Now
              </Button>
            </div>
          )}

          <Tabs defaultValue="content" className="space-y-6">
            <TabsList className="h-auto p-1 gap-1 bg-muted/50 flex-wrap">
              {[
                { value: 'content',      label: 'Content Library',  icon: BookOpen     },
                { value: 'orders',       label: 'Orders',           icon: ShoppingCart },
                {
                  value: 'publications',
                  label: `Submissions${pendingPubs.length > 0 ? ` (${pendingPubs.length})` : ''}`,
                  icon: FileText
                },
                { value: 'users',        label: 'Users',            icon: Users        },
                { value: 'profile',      label: 'My Profile',       icon: User         },
              ].map(({ value, label, icon: Icon }) => (
                <TabsTrigger key={value} value={value}
                  className="gap-2 text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg">
                  <Icon className="h-4 w-4" />{label}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* ══════════════════════════ CONTENT TAB ══════════════════════════ */}
            <TabsContent value="content">
              <div className="space-y-4">
                <Card className="p-4 shadow-soft">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3 flex-wrap flex-1">
                      <div className="relative min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input type="text" placeholder="Search title, author…"
                          value={contentSearch}
                          onChange={e => setContentSearch(e.target.value)}
                          className="pl-9 pr-3 py-1.5 text-sm border rounded-lg bg-background w-full focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div className="flex gap-1 flex-wrap">
                        {['all', 'published', 'draft', 'archived', 'pending_review'].map(s => (
                          <button key={s} onClick={() => setContentStatusFilter(s)}
                            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors capitalize ${
                              contentStatusFilter === s
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-background text-muted-foreground border-border hover:border-foreground/30'
                            }`}>
                            {s.replace('_', ' ')}
                          </button>
                        ))}
                      </div>
                      <select value={contentTypeFilter} onChange={e => setContentTypeFilter(e.target.value)}
                        className="text-xs border rounded-lg px-3 py-1.5 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer">
                        <option value="all">All types</option>
                        {CONTENT_TYPES.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex border rounded-lg overflow-hidden">
                        <button onClick={() => setContentViewMode('grid')}
                          className={`p-2 transition-colors ${contentViewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}
                          title="Grid view"><Grid3X3 className="h-4 w-4" /></button>
                        <button onClick={() => setContentViewMode('list')}
                          className={`p-2 transition-colors ${contentViewMode === 'list' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}
                          title="List view"><List className="h-4 w-4" /></button>
                      </div>
                      <Button size="sm" variant="outline" onClick={loadContent} className="gap-1 px-2.5">
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button size="sm" onClick={() => navigate('/upload')} className="gap-2">
                        <Plus className="h-4 w-4" /> New
                      </Button>
                    </div>
                  </div>
                  {!contentLoading && (
                    <p className="text-xs text-muted-foreground mt-3">
                      Showing {filteredContent.length} of {contentItems.length} items
                    </p>
                  )}
                </Card>

                {contentLoading ? (
                  <div className="flex justify-center py-24">
                    <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                  </div>
                ) : filteredContent.length === 0 ? (
                  <Card className="p-16 text-center shadow-soft">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                    <p className="text-muted-foreground mb-4">No content found matching your filters.</p>
                    <Button onClick={() => navigate('/upload')} className="gap-2">
                      <Plus className="h-4 w-4" /> Upload Content
                    </Button>
                  </Card>
                ) : contentViewMode === 'grid' ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {filteredContent.map(item => <ContentGridCard key={item.id} item={item} />)}
                  </div>
                ) : (
                  <Card className="shadow-soft overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/30 text-muted-foreground">
                            <th className="text-left px-4 py-3 font-medium">Content</th>
                            <th className="text-left px-4 py-3 font-medium">Type</th>
                            <th className="text-left px-4 py-3 font-medium">Status</th>
                            <th className="text-left px-4 py-3 font-medium">Price</th>
                            <th className="text-left px-4 py-3 font-medium">Views / DL</th>
                            <th className="text-left px-4 py-3 font-medium">Created</th>
                            <th className="text-left px-4 py-3 font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {filteredContent.map(item => <ContentListRow key={item.id} item={item} />)}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* ══════════════════════════ ORDERS TAB ══════════════════════════ */}
            <TabsContent value="orders">
              <div className="space-y-4">
                <Card className="p-4 shadow-soft">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3 flex-wrap flex-1">
                      <div className="relative min-w-[260px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input type="text"
                          placeholder="Search order #, customer, status, address…"
                          value={orderSearch}
                          onChange={e => setOrderSearch(e.target.value)}
                          className="pl-9 pr-3 py-1.5 text-sm border rounded-lg bg-background w-full focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <div className="flex gap-1 flex-wrap">
                        {(['all', ...ORDER_STATUSES] as string[]).map(s => (
                          <button key={s} onClick={() => setOrderStatusFilter(s)}
                            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors capitalize ${
                              orderStatusFilter === s
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-background text-muted-foreground border-border hover:border-foreground/30'
                            }`}>
                            {s === 'all' ? `All (${orders.length})` : s}
                          </button>
                        ))}
                      </div>
                      <select value={orderPaymentFilter} onChange={e => setOrderPaymentFilter(e.target.value)}
                        className="text-xs border rounded-lg px-3 py-1.5 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer">
                        <option value="all">All payments</option>
                        {PAYMENT_STATUSES.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
                      </select>
                    </div>
                    <Button size="sm" variant="outline" onClick={loadOrders} className="gap-1 px-2.5">
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Bulk actions */}
                  {selectedOrders.length > 0 && (
                    <div className="mt-3 pt-3 border-t flex items-center gap-3 flex-wrap">
                      <span className="text-sm font-semibold text-foreground">{selectedOrders.length} selected</span>
                      <span className="text-xs text-muted-foreground">Bulk update to:</span>
                      {ORDER_STATUSES.map(s => (
                        <button key={s} onClick={() => bulkUpdateOrderStatus(s)}
                          className={`text-xs px-3 py-1 rounded-full border font-medium transition-colors capitalize ${ORDER_STATUS_COLORS[s]}`}>
                          {s}
                        </button>
                      ))}
                      <button
                        onClick={bulkDeleteOrders}
                        className="text-xs px-3 py-1 rounded-full border font-medium transition-colors bg-red-50 text-red-700 border-red-200 hover:bg-red-100 ml-1"
                      >
                        Delete selected
                      </button>
                      <button onClick={() => setSelectedOrders([])}
                        className="text-xs text-muted-foreground hover:text-foreground ml-auto underline">
                        Clear selection
                      </button>
                    </div>
                  )}
                </Card>

                {ordersLoading ? (
                  <div className="flex justify-center py-24">
                    <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                  </div>
                ) : filteredOrders.length === 0 ? (
                  <Card className="p-16 text-center shadow-soft">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                    <p className="text-muted-foreground">No orders found matching your filters.</p>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {filteredOrders.map(order => {
                      const isExpanded = expandedOrder === order.id;
                      const isUpdating = updatingOrder === order.id;
                      const isDeleting = deletingOrder === order.id;
                      const isSelected = selectedOrders.includes(order.id);

                      return (
                        <Card key={order.id}
                          className={`shadow-soft overflow-hidden transition-all duration-200 ${isSelected ? 'ring-2 ring-primary/40' : ''}`}>
                          <div className="p-4">
                            <div className="flex items-start gap-3">
                              <input type="checkbox" checked={isSelected}
                                onChange={e => {
                                  if (e.target.checked) setSelectedOrders(prev => [...prev, order.id]);
                                  else setSelectedOrders(prev => prev.filter(id => id !== order.id));
                                }}
                                className="mt-1.5 h-4 w-4 rounded border-border cursor-pointer accent-primary flex-shrink-0"
                              />
                              <div className="flex-shrink-0">
                                {order.customer?.avatar_url ? (
                                  <img src={order.customer.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover border" />
                                ) : (
                                  <div className="h-9 w-9 rounded-full bg-muted border flex items-center justify-center text-sm font-semibold text-muted-foreground">
                                    {(order.customer?.full_name || order.customer?.email || '?')[0]?.toUpperCase()}
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-4 flex-wrap">
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                      <span className="font-mono font-semibold text-sm text-foreground">
                                        #{order.order_number}
                                      </span>
                                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${ORDER_STATUS_COLORS[order.status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                                        {order.status}
                                      </span>
                                      <span className={`text-xs font-medium ${PAYMENT_STATUS_COLORS[order.payment_status] || 'text-muted-foreground'}`}>
                                        {order.payment_status === 'paid' && '✓ '}{order.payment_status}
                                      </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      {order.customer?.full_name || order.customer?.email || 'Guest'}
                                      {order.customer?.email && order.customer?.full_name && (
                                        <span className="opacity-60 ml-1.5">· {order.customer.email}</span>
                                      )}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      {new Date(order.created_at).toLocaleDateString('en-KE', {
                                        year: 'numeric', month: 'short', day: 'numeric',
                                        hour: '2-digit', minute: '2-digit',
                                      })}
                                      {order.payment_method && <span className="ml-2 capitalize">· {order.payment_method}</span>}
                                    </p>
                                  </div>
                                  <div className="text-right flex-shrink-0">
                                    <div className="text-lg font-bold text-foreground">
                                      KES {parseFloat(order.total_price || 0).toLocaleString()}
                                    </div>
                                    {(parseFloat(order.discount || 0) > 0 || parseFloat(order.tax || 0) > 0) && (
                                      <div className="text-xs text-muted-foreground space-x-2">
                                        {parseFloat(order.discount || 0) > 0 && <span>Disc: −{parseFloat(order.discount).toLocaleString()}</span>}
                                        {parseFloat(order.tax || 0) > 0 && <span>Tax: +{parseFloat(order.tax).toLocaleString()}</span>}
                                      </div>
                                    )}
                                    <div className="text-[10px] text-muted-foreground">{order.currency || 'KES'}</div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3 mt-3 flex-wrap">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs text-muted-foreground">Status:</span>
                                    <select value={order.status} disabled={isUpdating}
                                      onChange={e => updateOrderStatus(order.id, e.target.value)}
                                      className="text-xs border rounded-md px-2 py-1 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer disabled:opacity-50">
                                      {ORDER_STATUSES.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
                                    </select>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs text-muted-foreground">Payment:</span>
                                    <select value={order.payment_status} disabled={isUpdating}
                                      onChange={e => updatePaymentStatus(order.id, e.target.value)}
                                      className="text-xs border rounded-md px-2 py-1 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer disabled:opacity-50">
                                      {PAYMENT_STATUSES.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
                                    </select>
                                  </div>
                                  {isUpdating && <div className="h-3.5 w-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />}

                                  <button
                                    onClick={() => deleteOrder(order.id, order.order_number)}
                                    disabled={isDeleting}
                                    className="ml-auto p-1.5 hover:bg-red-50 rounded text-muted-foreground hover:text-red-600 transition-colors disabled:opacity-40 flex items-center gap-1 text-xs"
                                    title="Delete order"
                                  >
                                    {isDeleting
                                      ? <div className="h-3.5 w-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                                      : <Trash2 className="h-3.5 w-3.5" />
                                    }
                                  </button>

                                  <button
                                    onClick={() => {
                                      const next = isExpanded ? null : order.id;
                                      setExpandedOrder(next);
                                      if (next) loadOrderItems(order.id);
                                    }}
                                    className="text-xs text-primary hover:underline flex items-center gap-1"
                                  >
                                    {isExpanded
                                      ? <><ChevronUp className="h-3 w-3" /> Hide</>
                                      : <><ChevronDown className="h-3 w-3" /> Details</>
                                    }
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="border-t bg-muted/20 p-4 space-y-4">
                              <div>
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Order Items</h4>
                                {!orderItemsMap[order.id] ? (
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <div className="h-3 w-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                    Loading items…
                                  </div>
                                ) : orderItemsMap[order.id].length === 0 ? (
                                  <p className="text-xs text-muted-foreground">No items found.</p>
                                ) : (
                                  <div className="space-y-2">
                                    {orderItemsMap[order.id].map((item: any) => (
                                      <div key={item.id} className="flex items-center gap-3 bg-background rounded-lg p-2.5 border">
                                        {item.content?.cover_image_url ? (
                                          <img src={item.content.cover_image_url} alt="" className="h-10 w-8 object-cover rounded border flex-shrink-0" />
                                        ) : (
                                          <div className="h-10 w-8 bg-muted rounded border flex items-center justify-center flex-shrink-0">
                                            <BookOpen className="h-3 w-3 text-muted-foreground" />
                                          </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                          <div className="text-sm font-medium truncate">{item.title || item.content?.title || 'Unknown'}</div>
                                          <div className="text-xs text-muted-foreground capitalize">{item.content?.content_type || '—'}</div>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                          <div className="text-sm font-semibold">KES {parseFloat(item.total_price || 0).toLocaleString()}</div>
                                          <div className="text-xs text-muted-foreground">Qty {item.quantity} × {parseFloat(item.unit_price || 0).toLocaleString()}</div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              <div className="grid sm:grid-cols-2 gap-4">
                                {(order.shipping_address || order.billing_address) && (
                                  <div>
                                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Addresses</h4>
                                    {order.shipping_address && (
                                      <p className="text-xs text-muted-foreground mb-1">
                                        <span className="font-medium text-foreground">Shipping: </span>{order.shipping_address}
                                      </p>
                                    )}
                                    {order.billing_address && (
                                      <p className="text-xs text-muted-foreground">
                                        <span className="font-medium text-foreground">Billing: </span>{order.billing_address}
                                      </p>
                                    )}
                                  </div>
                                )}
                                <div>
                                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Internal Note</h4>
                                  <div className="flex gap-2">
                                    <input type="text"
                                      value={orderNotes[order.id] ?? (order.notes || '')}
                                      onChange={e => setOrderNotes(prev => ({ ...prev, [order.id]: e.target.value }))}
                                      placeholder="Add internal admin note…"
                                      className="flex-1 text-xs border rounded-lg px-3 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    />
                                    <Button size="sm" variant="outline"
                                      className="h-8 text-xs px-3 gap-1 flex-shrink-0"
                                      onClick={() => saveOrderNote(order.id)}>
                                      <Save className="h-3 w-3" /> Save
                                    </Button>
                                  </div>
                                  {order.notes && orderNotes[order.id] === undefined && (
                                    <p className="text-xs text-muted-foreground mt-1.5 italic">{order.notes}</p>
                                  )}
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-4 pt-3 border-t text-xs text-muted-foreground">
                                {order.payment_reference && (
                                  <span><span className="font-medium text-foreground">Reference: </span>{order.payment_reference}</span>
                                )}
                                {order.paid_at && (
                                  <span><span className="font-medium text-foreground">Paid: </span>{new Date(order.paid_at).toLocaleString()}</span>
                                )}
                                {order.completed_at && (
                                  <span><span className="font-medium text-foreground">Completed: </span>{new Date(order.completed_at).toLocaleString()}</span>
                                )}
                                {order.cancelled_at && (
                                  <span><span className="font-medium text-foreground">Cancelled: </span>{new Date(order.cancelled_at).toLocaleString()}</span>
                                )}
                              </div>
                            </div>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ══════════════════════ PUBLICATIONS TAB ═══════════════════════ */}
            <TabsContent value="publications">
              <div className="space-y-4">

                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex gap-2 flex-wrap">
                    {(['all', 'pending', 'under_review', 'approved', 'rejected'] as const).map(s => (
                      <button key={s} onClick={() => setPubStatusFilter(s)}
                        className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                          pubStatusFilter === s
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background text-muted-foreground border-border hover:border-foreground/30'
                        }`}>
                        {s === 'all' ? `All (${publications.length})` : s.replace('_', ' ')}
                        {s === 'pending' && pendingPubs.length > 0 && pubStatusFilter !== 'pending' && (
                          <span className="ml-1.5 bg-amber-500 text-white text-[10px] rounded-full px-1.5 py-0.5">
                            {pendingPubs.length}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                  <Button size="sm" variant="outline" onClick={loadPublications} className="gap-2">
                    <RefreshCw className="h-4 w-4" /> Refresh
                  </Button>
                </div>

                {(() => {
                  const filtered = pubStatusFilter === 'all'
                    ? publications
                    : publications.filter(p => p.status === pubStatusFilter);

                  if (filtered.length === 0) return (
                    <Card className="p-12 text-center shadow-soft">
                      <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                      <p className="text-muted-foreground">
                        {pubStatusFilter === 'all' ? 'No manuscript submissions yet.' : `No ${pubStatusFilter.replace('_', ' ')} submissions.`}
                      </p>
                    </Card>
                  );

                  return filtered.map(pub => (
                    <Card key={pub.id} className="shadow-soft overflow-hidden">
                      <div className="p-6">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div className="flex gap-4 flex-1 min-w-0">
                            {pub.cover_image_url && (
                              <img src={pub.cover_image_url} alt=""
                                className="h-20 w-14 object-cover rounded-lg border flex-shrink-0 shadow-sm" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                                <h3 className="font-forum text-lg">{pub.title}</h3>
                                {pub.subtitle && <span className="text-sm text-muted-foreground italic">{pub.subtitle}</span>}
                                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${
                                  pub.status === 'approved'     ? 'bg-green-50 text-green-700 border-green-200' :
                                  pub.status === 'rejected'     ? 'bg-red-50 text-red-700 border-red-200' :
                                  pub.status === 'under_review' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                  'bg-amber-50 text-amber-700 border-amber-200'
                                }`}>
                                  {pub.status.replace('_', ' ')}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 mb-1">
                                {/* ✅ FIX: view exposes submitted_by_email, no avatar from view */}
                                <p className="text-sm text-muted-foreground">
                                  By <span className="font-medium text-foreground">{pub.author_name}</span>
                                  {pub.author_email && <span className="ml-2">· {pub.author_email}</span>}
                                  {pub.author_phone && <span className="ml-2 opacity-60">· {pub.author_phone}</span>}
                                  {pub.submitted_by_email && (
                                    <span className="ml-2 text-xs opacity-60">(account: {pub.submitted_by_email})</span>
                                  )}
                                </p>
                              </div>

                              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{pub.description}</p>

                              <div className="flex gap-3 text-xs text-muted-foreground flex-wrap mb-2">
                                <span className="capitalize bg-muted px-2 py-0.5 rounded">{pub.publishing_type} publishing</span>
                                <span className="bg-muted px-2 py-0.5 rounded">{pub.language}</span>
                                {pub.pages && <span className="bg-muted px-2 py-0.5 rounded">{pub.pages} pages</span>}
                                {pub.target_audience && <span className="bg-muted px-2 py-0.5 rounded">Audience: {pub.target_audience}</span>}
                                {pub.category_name && <span className="bg-muted px-2 py-0.5 rounded">{pub.category_name}</span>}
                                <span>Submitted {new Date(pub.created_at).toLocaleDateString()}</span>
                                {pub.reviewed_at && <span>Reviewed {new Date(pub.reviewed_at).toLocaleDateString()}</span>}
                              </div>

                              {pub.keywords?.length > 0 && (
                                <div className="flex gap-1 flex-wrap mb-2">
                                  {pub.keywords.map((k: string) => (
                                    <span key={k} className="text-[11px] bg-primary/8 border border-primary/15 px-2 py-0.5 rounded-full text-primary/70">
                                      {k}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Action column */}
                          <div className="flex flex-col gap-2 flex-shrink-0 min-w-[160px]">
                            {(pub.status === 'pending' || pub.status === 'under_review') && (
                              <>
                                <Button size="sm" className="gap-2 bg-green-600 hover:bg-green-700 text-white w-full"
                                  onClick={() => handlePubAction(pub.id, 'approved')} disabled={processingPub}>
                                  <CheckCircle className="h-4 w-4" /> Approve
                                </Button>
                                <Button size="sm" variant="outline" className="gap-2 border-blue-200 text-blue-700 w-full"
                                  onClick={() => handlePubAction(pub.id, 'under_review')}
                                  disabled={processingPub || pub.status === 'under_review'}>
                                  <Clock className="h-4 w-4" />
                                  {pub.status === 'under_review' ? 'In Review' : 'Under Review'}
                                </Button>
                                <Button size="sm" variant="outline" className="gap-2 border-red-200 text-red-700 w-full"
                                  onClick={() => setActivePublication(pub)} disabled={processingPub}>
                                  <XCircle className="h-4 w-4" /> Reject
                                </Button>
                              </>
                            )}

                            {pub.status === 'approved' && (
                              <Button
                                size="sm"
                                className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground w-full font-semibold"
                                onClick={() => publishManuscriptAsContent(pub)}
                                disabled={publishingAsContent === pub.id}
                              >
                                {publishingAsContent === pub.id ? (
                                  <><div className="h-4 w-4 border-2 border-white/60 border-t-transparent rounded-full animate-spin" /> Publishing…</>
                                ) : (
                                  <><Rocket className="h-4 w-4" /> Publish Live</>
                                )}
                              </Button>
                            )}

                            {pub.manuscript_file_url && (
                              <a href={pub.manuscript_file_url} target="_blank" rel="noopener noreferrer">
                                <Button size="sm" variant="outline" className="gap-2 w-full">
                                  <Eye className="h-4 w-4" /> View File
                                </Button>
                              </a>
                            )}

                            <Button
                              size="sm"
                              variant={editingNotesPub === pub.id ? 'default' : 'outline'}
                              className="gap-2 w-full text-xs"
                              onClick={() => {
                                if (editingNotesPub === pub.id) {
                                  setEditingNotesPub(null);
                                  setAdminNotesInput('');
                                } else {
                                  setEditingNotesPub(pub.id);
                                  setAdminNotesInput(pub.admin_notes || '');
                                }
                              }}
                            >
                              <StickyNote className="h-3.5 w-3.5" />
                              {editingNotesPub === pub.id ? 'Cancel Notes' : 'Admin Notes'}
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-2 w-full border-red-200 text-red-600 hover:bg-red-50 text-xs"
                              onClick={() => deletePublication(pub.id, pub.title)}
                              disabled={deletingPub === pub.id}
                            >
                              {deletingPub === pub.id
                                ? <div className="h-3.5 w-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                                : <Trash2 className="h-3.5 w-3.5" />
                              }
                              Delete
                            </Button>
                          </div>
                        </div>

                        {editingNotesPub === pub.id && (
                          <div className="mt-4 pt-4 border-t">
                            <div className="flex items-center gap-2 mb-2">
                              <StickyNote className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">Admin Notes <span className="text-muted-foreground font-normal text-xs">(internal only)</span></span>
                            </div>
                            <Textarea
                              value={adminNotesInput}
                              onChange={e => setAdminNotesInput(e.target.value)}
                              placeholder="Add internal notes about this submission…"
                              rows={3}
                              className="mb-3 text-sm"
                            />
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => saveAdminNotes(pub.id)} disabled={savingNotes} className="gap-2">
                                <Save className="h-3.5 w-3.5" />
                                {savingNotes ? 'Saving…' : 'Save Notes'}
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => { setEditingNotesPub(null); setAdminNotesInput(''); }}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}

                        {pub.admin_notes && editingNotesPub !== pub.id && (
                          <div className="mt-3 pt-3 border-t flex items-start gap-2">
                            <StickyNote className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-muted-foreground italic">{pub.admin_notes}</p>
                          </div>
                        )}

                        {pub.rejection_feedback && (
                          <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">
                            <span className="font-medium">Rejection feedback: </span>{pub.rejection_feedback}
                          </div>
                        )}
                      </div>
                    </Card>
                  ));
                })()}
              </div>

              {activePublication && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                  <Card className="p-6 max-w-lg w-full mx-4 shadow-elevated">
                    <h3 className="font-forum text-xl mb-1">Reject Submission</h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      "{activePublication.title}" by {activePublication.author_name}
                    </p>
                    <Textarea
                      placeholder="Provide feedback to the author (optional but recommended)…"
                      value={rejectionFeedback}
                      onChange={e => setRejectionFeedback(e.target.value)}
                      rows={4}
                      className="mb-4"
                    />
                    <div className="flex gap-3 justify-end">
                      <Button variant="outline" onClick={() => { setActivePublication(null); setRejectionFeedback(''); }}>
                        Cancel
                      </Button>
                      <Button className="bg-red-600 hover:bg-red-700 text-white" disabled={processingPub}
                        onClick={() => handlePubAction(activePublication.id, 'rejected')}>
                        {processingPub ? 'Processing…' : 'Confirm Rejection'}
                      </Button>
                    </div>
                  </Card>
                </div>
              )}
            </TabsContent>

            {/* ════════════════════════ USERS TAB ════════════════════════════ */}
            <TabsContent value="users">
              <Card className="shadow-soft">
                <div className="p-6 border-b flex items-center justify-between gap-4 flex-wrap">
                  <h2 className="font-forum text-xl">User Management</h2>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Search users…" value={userSearch}
                        onChange={e => setUserSearch(e.target.value)} className="pl-9 w-60" />
                    </div>
                    <Button size="sm" variant="outline" onClick={loadAll} className="gap-2">
                      <RefreshCw className="h-4 w-4" /> Refresh
                    </Button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30 text-muted-foreground">
                        <th className="text-left px-6 py-3 font-medium">User</th>
                        <th className="text-left px-4 py-3 font-medium">Role</th>
                        <th className="text-left px-4 py-3 font-medium">Account Type</th>
                        <th className="text-left px-4 py-3 font-medium">Joined</th>
                        <th className="text-left px-4 py-3 font-medium">Status</th>
                        <th className="text-left px-4 py-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredUsers.map(u => {
                        const isProtected = ADMIN_IDS.includes(u.id);
                        return (
                          <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                {u.avatar_url ? (
                                  <img src={u.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover border" />
                                ) : (
                                  <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center font-semibold text-sm text-muted-foreground">
                                    {(u.full_name || u.email || '?')[0].toUpperCase()}
                                  </div>
                                )}
                                <div>
                                  <div className="font-medium">{u.full_name || '—'}</div>
                                  <div className="text-xs text-muted-foreground">{u.email || u.id.slice(0, 12) + '…'}</div>
                                </div>
                                {isProtected && <Shield className="h-3.5 w-3.5 text-red-400 ml-1 flex-shrink-0" />}
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              {isProtected ? (
                                <span className={`text-xs px-2 py-1 rounded-full border font-medium ${ROLE_COLORS['admin']}`}>admin</span>
                              ) : (
                                <select value={u.role || 'reader'} disabled={savingRole === u.id}
                                  onChange={e => changeUserRole(u.id, e.target.value)}
                                  className={`text-xs px-2 py-1 rounded-full border font-medium cursor-pointer focus:outline-none disabled:opacity-50 ${ROLE_COLORS[u.role] || ROLE_COLORS['reader']}`}>
                                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                              )}
                            </td>
                            <td className="px-4 py-4 text-muted-foreground text-xs capitalize">{u.account_type || 'personal'}</td>
                            <td className="px-4 py-4 text-muted-foreground text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                            <td className="px-4 py-4">
                              <button onClick={() => toggleActive(u.id, u.is_active)} disabled={isProtected}
                                className={`text-xs px-2 py-0.5 rounded-full border font-medium transition-opacity ${
                                  u.is_active !== false ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                                } ${isProtected ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:opacity-75'}`}>
                                {u.is_active !== false ? 'Active' : 'Inactive'}
                              </button>
                            </td>
                            <td className="px-4 py-4">
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                                onClick={() => navigate(`/content?user=${u.id}`)} title="View user content">
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {filteredUsers.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">No users found.</div>
                  )}
                </div>
              </Card>
            </TabsContent>

            {/* ═══════════════════════ PROFILE TAB ═══════════════════════════ */}
            <TabsContent value="profile">
              <div className="max-w-2xl space-y-6">
                <Card className="p-6 shadow-soft">
                  <h2 className="font-forum text-xl mb-6">My Profile</h2>

                  <div className="mb-6">
                    <label className="text-sm font-medium mb-2 block">Profile Picture</label>
                    <div className="flex items-center gap-4">
                      {(avatarPreview || avatarUrl) ? (
                        <img src={avatarPreview || avatarUrl} alt=""
                          className="h-20 w-20 rounded-full object-cover border-2 border-primary/20" />
                      ) : (
                        <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center font-forum text-3xl text-muted-foreground">
                          {(adminProfile?.full_name || 'A')[0].toUpperCase()}
                        </div>
                      )}
                      <div>
                        <input type="file" accept="image/*" ref={fileRef} onChange={handleAvatar} className="hidden" />
                        <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => fileRef.current?.click()}>
                          <Camera className="h-4 w-4" /> Change Photo
                        </Button>
                        <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WebP · max 5 MB</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Email</label>
                      <Input value={adminProfile?.email || ''} readOnly disabled className="bg-muted/50 cursor-not-allowed" />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Full Name</label>
                        <Input value={fullName} onChange={e => setFullName(e.target.value)}
                          maxLength={MAX_NAME} placeholder="Your name" disabled={saving} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Phone</label>
                        <Input value={phone} onChange={e => setPhone(e.target.value)}
                          placeholder="+254 7xx xxx xxx" disabled={saving} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Address</label>
                      <Textarea value={address} onChange={e => setAddress(e.target.value)}
                        rows={2} placeholder="P.O. Box …" disabled={saving} />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Organization</label>
                        <Input value={organization} onChange={e => setOrganization(e.target.value)}
                          placeholder="Intercen Books" disabled={saving} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Department</label>
                        <Input value={department} onChange={e => setDepartment(e.target.value)}
                          placeholder="Editorial" disabled={saving} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Role</label>
                      <Input value={role || 'admin'} readOnly disabled className="bg-muted/50 cursor-not-allowed capitalize" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">
                        Bio <span className="text-muted-foreground font-normal">({bio.length}/{MAX_BIO})</span>
                      </label>
                      <Textarea value={bio} onChange={e => setBio(e.target.value)}
                        maxLength={MAX_BIO} rows={4} placeholder="About you…" disabled={saving} />
                    </div>
                    <div className="flex gap-4 items-center flex-wrap pt-2">
                      <Button onClick={saveProfile} disabled={saving} className="gap-2">
                        <Save className="h-4 w-4" />{saving ? 'Saving…' : 'Save Changes'}
                      </Button>
                      <Button variant="outline" onClick={() => navigate(-1)} disabled={saving}>Back</Button>
                    </div>
                  </div>
                </Card>
              </div>
            </TabsContent>

          </Tabs>
        </div>
      </div>
    </>
  );
}