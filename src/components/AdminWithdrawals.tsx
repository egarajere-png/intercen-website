// src/components/AdminWithdrawals.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Drop-in "Withdrawals" tab component for AdminDashboard.
//
// Features:
//   ✅ Lists all withdrawal requests across all authors
//   ✅ Status filter: all / pending / processing / completed / failed
//   ✅ "Process" button → calls admin-process-withdrawal edge function
//   ✅ Admin notes field per request
//   ✅ Shows author info, M-Pesa phone, amount, timestamps
//   ✅ M-Pesa transaction ID shown on completed payouts
//   ✅ Auto-polls every 30 s for status updates (processing → completed)
//   ✅ No window.confirm — uses inline confirm step
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/SupabaseClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  Banknote, RefreshCw, Clock, CheckCircle, XCircle,
  Phone, User, AlertTriangle, Info, ChevronDown, ChevronUp,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface WithdrawalRow {
  id:                    string;
  author_id:             string;
  amount:                number;
  status:                'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  mpesa_phone:           string;
  mpesa_name:            string | null;
  mpesa_transaction_id:  string | null;
  mpesa_result_desc:     string | null;
  mpesa_conversation_id: string | null;
  admin_notes:           string | null;
  created_at:            string;
  processed_at:          string | null;
  completed_at:          string | null;
  failed_at:             string | null;
  author: {
    full_name:   string | null;
    email:       string | null;
    avatar_url:  string | null;
  } | null;
  wallet: {
    available_balance: number;
    total_earned:      number;
    commission_rate:   number;
  } | null;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending:    { label: 'Pending',    color: 'bg-amber-50 text-amber-700 border-amber-200',   icon: Clock       },
  processing: { label: 'Processing', color: 'bg-blue-50 text-blue-700 border-blue-200',       icon: RefreshCw   },
  completed:  { label: 'Completed',  color: 'bg-green-50 text-green-700 border-green-200',    icon: CheckCircle },
  failed:     { label: 'Failed',     color: 'bg-red-50 text-red-700 border-red-200',          icon: XCircle     },
  cancelled:  { label: 'Cancelled',  color: 'bg-gray-100 text-gray-600 border-gray-200',      icon: XCircle     },
};

function displayPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 12) return `+${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`;
  return raw;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminWithdrawals() {
  const { toast }  = useToast();
  const pollRef    = useRef<ReturnType<typeof setInterval> | null>(null);

  const [withdrawals,    setWithdrawals]    = useState<WithdrawalRow[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [statusFilter,   setStatusFilter]   = useState<string>('all');
  const [processingId,   setProcessingId]   = useState<string | null>(null);
  const [confirmId,      setConfirmId]      = useState<string | null>(null);
  const [adminNotes,     setAdminNotes]     = useState<Record<string, string>>({});
  const [expanded,       setExpanded]       = useState<string | null>(null);

  // ── Loader ─────────────────────────────────────────────────────────────────

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data, error } = await supabase
        .from('withdrawal_requests')
        .select(`
          *,
          author:profiles!withdrawal_requests_author_id_fkey(full_name, email, avatar_url),
          wallet:author_wallets!withdrawal_requests_wallet_id_fkey(available_balance, total_earned, commission_rate)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setWithdrawals((data || []).map((w: any) => ({
        ...w,
        amount: parseFloat(w.amount),
        wallet: w.wallet ? {
          available_balance: parseFloat(w.wallet.available_balance),
          total_earned:      parseFloat(w.wallet.total_earned),
          commission_rate:   parseFloat(w.wallet.commission_rate),
        } : null,
      })));
    } catch (err: any) {
      if (!silent) toast({ variant: 'destructive', title: 'Failed to load withdrawals', description: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    pollRef.current = setInterval(() => load(true), 30_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [load]);

  // ── Process withdrawal ─────────────────────────────────────────────────────

  const processWithdrawal = async (withdrawalId: string) => {
    setProcessingId(withdrawalId);
    setConfirmId(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-process-withdrawal`,
        {
          method: 'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey':        import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            withdrawal_id: withdrawalId,
            admin_notes:   adminNotes[withdrawalId] || undefined,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Processing failed');

      toast({
        title:       '💸 M-Pesa B2C initiated',
        description: `Payment is being sent. Conversation ID: ${data.conversation_id}`,
      });

      await load(true);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed to process withdrawal', description: err.message });
    } finally {
      setProcessingId(null);
    }
  };

  // ── Derived ────────────────────────────────────────────────────────────────

  const filtered = statusFilter === 'all'
    ? withdrawals
    : withdrawals.filter(w => w.status === statusFilter);

  const pendingCount = withdrawals.filter(w => w.status === 'pending').length;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* Header + filters */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1 flex-wrap">
          {(['all', 'pending', 'processing', 'completed', 'failed'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors capitalize ${
                statusFilter === s
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-muted-foreground border-border hover:border-foreground/30'
              }`}
            >
              {s === 'all' ? `All (${withdrawals.length})` : s}
              {s === 'pending' && pendingCount > 0 && statusFilter !== 'pending' && (
                <span className="ml-1.5 bg-amber-500 text-white text-[10px] rounded-full px-1.5 py-0.5">{pendingCount}</span>
              )}
            </button>
          ))}
        </div>
        <Button size="sm" variant="outline" onClick={() => load()} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* Info */}
      <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl p-3">
        <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 leading-relaxed">
          Click <strong>Process</strong> on any pending request to initiate an M-Pesa B2C payment directly from your registered business till.
          The author will be notified automatically once the payment is confirmed by Safaricom.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center shadow-soft">
          <Banknote className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-muted-foreground">
            {statusFilter === 'all' ? 'No withdrawal requests yet.' : `No ${statusFilter} withdrawals.`}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(wd => {
            const cfg        = STATUS_CONFIG[wd.status] || STATUS_CONFIG.pending;
            const StatusIcon = cfg.icon;
            const isPending  = wd.status === 'pending';
            const isExpanded = expanded === wd.id;
            const isProcessing = processingId === wd.id;
            const isConfirming = confirmId   === wd.id;

            return (
              <Card key={wd.id} className={`shadow-soft overflow-hidden ${isPending ? 'ring-2 ring-amber-200' : ''}`}>
                <div className="p-5">
                  <div className="flex items-start gap-4 flex-wrap">

                    {/* Author avatar */}
                    <div className="flex-shrink-0">
                      {wd.author?.avatar_url ? (
                        <img src={wd.author.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover border" />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-muted border flex items-center justify-center">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <span className="font-semibold text-sm">{wd.author?.full_name || 'Unknown Author'}</span>
                            <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium flex items-center gap-1 ${cfg.color}`}>
                              <StatusIcon className="h-3 w-3" /> {cfg.label}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">{wd.author?.email}</p>
                          <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            <span>{displayPhone(wd.mpesa_phone)}</span>
                            {wd.mpesa_name && <span className="opacity-60">· {wd.mpesa_name}</span>}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-xl font-bold text-foreground">
                            KES {wd.amount.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {new Date(wd.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </div>
                        </div>
                      </div>

                      {/* Wallet context */}
                      {wd.wallet && (
                        <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                          <span>Balance after: <span className="font-medium text-foreground">KES {wd.wallet.available_balance.toLocaleString()}</span></span>
                          <span>Total earned: <span className="font-medium text-foreground">KES {wd.wallet.total_earned.toLocaleString()}</span></span>
                          <span>Rate: <span className="font-medium text-foreground">{Math.round(wd.wallet.commission_rate * 100)}%</span></span>
                        </div>
                      )}

                      {/* Transaction ID on completed */}
                      {wd.mpesa_transaction_id && (
                        <p className="text-xs text-green-700 mt-1.5 font-medium">
                          ✓ M-Pesa TxID: {wd.mpesa_transaction_id}
                        </p>
                      )}

                      {/* Error on failed */}
                      {wd.status === 'failed' && wd.mpesa_result_desc && (
                        <p className="text-xs text-red-600 mt-1.5">{wd.mpesa_result_desc}</p>
                      )}

                      {/* Admin notes display */}
                      {wd.admin_notes && (
                        <p className="text-xs text-muted-foreground italic mt-1.5">Note: {wd.admin_notes}</p>
                      )}
                    </div>
                  </div>

                  {/* Action row */}
                  {isPending && (
                    <div className="mt-4 pt-4 border-t space-y-3">
                      {/* Admin notes input */}
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Admin Notes (optional)</label>
                        <Textarea
                          value={adminNotes[wd.id] ?? ''}
                          onChange={e => setAdminNotes(prev => ({ ...prev, [wd.id]: e.target.value }))}
                          placeholder="Internal notes about this payout…"
                          rows={2}
                          className="text-xs"
                        />
                      </div>

                      {/* Confirm step */}
                      {isConfirming ? (
                        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                          <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-amber-800">
                              Send KES {wd.amount.toLocaleString()} to {displayPhone(wd.mpesa_phone)}?
                            </p>
                            <p className="text-xs text-amber-700/80">This will initiate a real M-Pesa B2C transfer.</p>
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            <Button size="sm" variant="outline" onClick={() => setConfirmId(null)}>Cancel</Button>
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white gap-1"
                              onClick={() => processWithdrawal(wd.id)}
                              disabled={isProcessing}
                            >
                              {isProcessing
                                ? <><div className="h-3.5 w-3.5 border-2 border-white/60 border-t-transparent rounded-full animate-spin" /> Sending…</>
                                : <><Banknote className="h-3.5 w-3.5" /> Confirm & Send</>
                              }
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white gap-2 w-full sm:w-auto"
                          onClick={() => setConfirmId(wd.id)}
                          disabled={isProcessing}
                        >
                          <Banknote className="h-4 w-4" />
                          Process M-Pesa Payout · KES {wd.amount.toLocaleString()}
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Expand for timestamps */}
                  <div className="flex justify-end mt-3">
                    <button
                      onClick={() => setExpanded(isExpanded ? null : wd.id)}
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      {isExpanded ? <><ChevronUp className="h-3 w-3" /> Less</> : <><ChevronDown className="h-3 w-3" /> Details</>}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t grid sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <span><span className="font-medium text-foreground">Request ID: </span>{wd.id}</span>
                      {wd.mpesa_conversation_id && <span><span className="font-medium text-foreground">Conv ID: </span>{wd.mpesa_conversation_id}</span>}
                      {wd.processed_at && <span><span className="font-medium text-foreground">Processed: </span>{new Date(wd.processed_at).toLocaleString('en-KE')}</span>}
                      {wd.completed_at && <span><span className="font-medium text-foreground">Completed: </span>{new Date(wd.completed_at).toLocaleString('en-KE')}</span>}
                      {wd.failed_at    && <span><span className="font-medium text-foreground">Failed: </span>{new Date(wd.failed_at).toLocaleString('en-KE')}</span>}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}