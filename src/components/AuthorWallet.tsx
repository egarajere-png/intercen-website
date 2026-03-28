// src/components/AuthorWallet.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Drop-in wallet tab for AuthorDashboard.
//
// Features:
//   ✅ Balance cards — Available, Pending, Total Earned, Total Withdrawn
//   ✅ Commission rate display
//   ✅ Withdraw dialog — M-Pesa phone validation, amount validation
//   ✅ Withdrawal history — status badges, timestamps
//   ✅ Transaction ledger — credits, debits, reversals with icons & colours
//   ✅ Earnings per content — table of per-book commission totals
//   ✅ Pending withdrawal guard (only one at a time)
//   ✅ Real-time-ish polling: refetches wallet every 30 s
//   ✅ No window.confirm / window.alert — uses inline UI
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/SupabaseClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import {
  Wallet, ArrowDownCircle, ArrowUpCircle, RefreshCw,
  TrendingUp, Clock, CheckCircle, XCircle, AlertTriangle,
  BookOpen, CreditCard, Phone, ChevronDown, ChevronUp,
  Info, Banknote, RotateCcw, Star,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface AuthorWalletData {
  id:                string;
  author_id:         string;
  available_balance: number;
  pending_balance:   number;
  total_earned:      number;
  total_withdrawn:   number;
  commission_rate:   number;
  mpesa_phone:       string | null;
  mpesa_name:        string | null;
  updated_at:        string;
}

interface WalletTransaction {
  id:            string;
  type:          'commission_credit' | 'withdrawal_debit' | 'withdrawal_reversal' | 'admin_credit' | 'admin_debit';
  status:        'completed' | 'pending' | 'failed' | 'reversed';
  amount:        number;
  balance_after: number;
  description:   string | null;
  order_id:      string | null;
  content_id:    string | null;
  metadata:      Record<string, any>;
  created_at:    string;
}

interface WithdrawalRequest {
  id:                string;
  amount:            number;
  status:            'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  mpesa_phone:       string;
  mpesa_name:        string | null;
  mpesa_transaction_id: string | null;
  mpesa_result_desc: string | null;
  admin_notes:       string | null;
  created_at:        string;
  processed_at:      string | null;
  completed_at:      string | null;
  failed_at:         string | null;
}

interface ContentEarning {
  content_id:    string;
  content_title: string;
  cover_image_url: string | null;
  content_type:  string;
  sale_count:    number;
  total_earned:  number;
  last_sale_at:  string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const MIN_WITHDRAWAL = 100;
const POLL_INTERVAL  = 30_000; // 30 s

const TX_TYPE_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string; sign: '+' | '-' }> = {
  commission_credit:  { label: 'Commission',          icon: TrendingUp,      color: 'text-green-600',  bg: 'bg-green-50',  sign: '+' },
  withdrawal_debit:   { label: 'Withdrawal',           icon: ArrowUpCircle,   color: 'text-orange-600', bg: 'bg-orange-50', sign: '-' },
  withdrawal_reversal:{ label: 'Reversal',             icon: RotateCcw,       color: 'text-blue-600',   bg: 'bg-blue-50',   sign: '+' },
  admin_credit:       { label: 'Admin Credit',         icon: ArrowDownCircle, color: 'text-teal-600',   bg: 'bg-teal-50',   sign: '+' },
  admin_debit:        { label: 'Admin Debit',          icon: ArrowUpCircle,   color: 'text-red-600',    bg: 'bg-red-50',    sign: '-' },
};

const WD_STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending:    { label: 'Pending',    color: 'bg-amber-50 text-amber-700 border-amber-200',   icon: Clock        },
  processing: { label: 'Processing', color: 'bg-blue-50 text-blue-700 border-blue-200',       icon: RefreshCw    },
  completed:  { label: 'Completed',  color: 'bg-green-50 text-green-700 border-green-200',    icon: CheckCircle  },
  failed:     { label: 'Failed',     color: 'bg-red-50 text-red-700 border-red-200',          icon: XCircle      },
  cancelled:  { label: 'Cancelled',  color: 'bg-gray-100 text-gray-600 border-gray-200',      icon: XCircle      },
};

// ── Phone helper ──────────────────────────────────────────────────────────────

function normalisePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('254') && digits.length === 12) return digits;
  if (digits.startsWith('0')   && digits.length === 10) return '254' + digits.slice(1);
  if (digits.length === 9)                               return '254' + digits;
  return null;
}

function displayPhone(raw: string): string {
  const n = normalisePhone(raw);
  if (!n) return raw;
  return `+${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6, 9)} ${n.slice(9)}`;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

const BalanceCard = ({
  label, value, icon: Icon, color, bg, sub,
}: {
  label: string; value: string; icon: any; color: string; bg: string; sub?: string;
}) => (
  <Card className="p-5 shadow-soft">
    <div className="flex items-start gap-3">
      <div className={`h-11 w-11 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs text-muted-foreground mb-0.5">{label}</div>
        <div className="text-2xl font-bold text-foreground leading-tight">{value}</div>
        {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
      </div>
    </div>
  </Card>
);

// ── Main Component ─────────────────────────────────────────────────────────────

interface AuthorWalletProps {
  userId: string;
}

export default function AuthorWallet({ userId }: AuthorWalletProps) {
  const { toast }  = useToast();
  const navigate   = useNavigate();
  const pollRef    = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── State ──────────────────────────────────────────────────────────────────
  const [wallet,       setWallet]       = useState<AuthorWalletData | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [withdrawals,  setWithdrawals]  = useState<WithdrawalRequest[]>([]);
  const [earnings,     setEarnings]     = useState<ContentEarning[]>([]);

  const [loading,      setLoading]      = useState(true);
  const [txPage,       setTxPage]       = useState(0);
  const [txTab,        setTxTab]        = useState<'all' | 'credits' | 'debits'>('all');
  const [showWdHistory, setShowWdHistory] = useState(true);

  // Withdraw dialog state
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [wdAmount,     setWdAmount]     = useState('');
  const [wdPhone,      setWdPhone]      = useState('');
  const [wdName,       setWdName]       = useState('');
  const [wdNotes,      setWdNotes]      = useState('');
  const [wdSubmitting, setWdSubmitting] = useState(false);
  const [wdError,      setWdError]      = useState('');

  const TX_PAGE_SIZE = 20;

  // ── Loaders ────────────────────────────────────────────────────────────────

  const loadWallet = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [walletRes, txRes, wdRes, earningsRes] = await Promise.all([
        supabase
          .from('author_wallets')
          .select('*')
          .eq('author_id', userId)
          .maybeSingle(),

        supabase
          .from('wallet_transactions')
          .select('*')
          .eq('author_id', userId)
          .order('created_at', { ascending: false })
          .limit(200),

        supabase
          .from('withdrawal_requests')
          .select('*')
          .eq('author_id', userId)
          .order('created_at', { ascending: false }),

        supabase
          .from('content_earnings_view')
          .select('*')
          .eq('author_id', userId)
          .order('total_earned', { ascending: false }),
      ]);

      if (walletRes.data) {
        setWallet({
          ...walletRes.data,
          available_balance: parseFloat(walletRes.data.available_balance),
          pending_balance:   parseFloat(walletRes.data.pending_balance),
          total_earned:      parseFloat(walletRes.data.total_earned),
          total_withdrawn:   parseFloat(walletRes.data.total_withdrawn),
          commission_rate:   parseFloat(walletRes.data.commission_rate),
        });
        // Pre-fill phone from saved mpesa_phone
        if (walletRes.data.mpesa_phone && !wdPhone) {
          setWdPhone(walletRes.data.mpesa_phone);
        }
        if (walletRes.data.mpesa_name && !wdName) {
          setWdName(walletRes.data.mpesa_name || '');
        }
      }

      setTransactions((txRes.data || []).map((t: any) => ({
        ...t,
        amount:        parseFloat(t.amount),
        balance_after: parseFloat(t.balance_after),
      })));

      setWithdrawals(wdRes.data || []);

      setEarnings((earningsRes.data || []).map((e: any) => ({
        ...e,
        total_earned: parseFloat(e.total_earned),
        sale_count:   parseInt(e.sale_count),
      })));

    } catch (err: any) {
      if (!silent) toast({ variant: 'destructive', title: 'Failed to load wallet', description: err.message });
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadWallet();
    // Poll silently every 30 s to catch status changes
    pollRef.current = setInterval(() => loadWallet(true), POLL_INTERVAL);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [loadWallet]);

  // ── Withdraw handler ───────────────────────────────────────────────────────

  const hasPendingWithdrawal = withdrawals.some(w => w.status === 'pending' || w.status === 'processing');

  const handleWithdraw = async () => {
    setWdError('');
    const amount = parseFloat(wdAmount);

    if (!wdAmount || isNaN(amount) || amount < MIN_WITHDRAWAL) {
      setWdError(`Minimum withdrawal is KES ${MIN_WITHDRAWAL.toLocaleString()}`);
      return;
    }
    if (!wallet || amount > wallet.available_balance) {
      setWdError(`Insufficient balance. Available: KES ${wallet?.available_balance.toLocaleString() ?? 0}`);
      return;
    }
    const normPhone = normalisePhone(wdPhone);
    if (!normPhone) {
      setWdError('Enter a valid M-Pesa number (e.g. 0712 345678 or 254712345678)');
      return;
    }
    if (hasPendingWithdrawal) {
      setWdError('You already have a pending withdrawal. Wait for it to complete.');
      return;
    }

    setWdSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/author-withdrawal-request`,
        {
          method: 'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey':        import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            amount,
            mpesa_phone: normPhone,
            mpesa_name:  wdName.trim() || undefined,
            notes:       wdNotes.trim() || undefined,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Withdrawal request failed');
      }

      toast({
        title:       '✅ Withdrawal request submitted',
        description: `KES ${amount.toLocaleString()} will be sent to ${displayPhone(normPhone)} once processed by admin.`,
      });

      setShowWithdrawDialog(false);
      setWdAmount('');
      setWdNotes('');
      setWdError('');
      await loadWallet();

    } catch (err: any) {
      setWdError(err.message);
    } finally {
      setWdSubmitting(false);
    }
  };

  // ── Derived ────────────────────────────────────────────────────────────────

  const filteredTx = transactions.filter(tx => {
    if (txTab === 'credits') return ['commission_credit', 'withdrawal_reversal', 'admin_credit'].includes(tx.type);
    if (txTab === 'debits')  return ['withdrawal_debit', 'admin_debit'].includes(tx.type);
    return true;
  });

  const visibleTx = filteredTx.slice(0, (txPage + 1) * TX_PAGE_SIZE);

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Loading wallet…</p>
        </div>
      </div>
    );
  }

  if (!wallet) {
    return (
      <Card className="p-12 text-center shadow-soft">
        <Wallet className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
        <h3 className="font-medium mb-1">Wallet Not Set Up</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Your wallet is created automatically once your first book sale is recorded.
          Start by publishing content!
        </p>
        <Button onClick={() => navigate('/upload')} className="gap-2">
          <BookOpen className="h-4 w-4" /> Upload Content
        </Button>
      </Card>
    );
  }

  const commissionPct = Math.round(wallet.commission_rate * 100);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-forum text-xl flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" /> Author Wallet
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Earnings, withdrawals and transaction history
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm" variant="outline"
            onClick={() => loadWallet()}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
          <Button
            size="sm"
            className="gap-2 bg-green-600 hover:bg-green-700 text-white"
            onClick={() => setShowWithdrawDialog(true)}
            disabled={hasPendingWithdrawal || wallet.available_balance < MIN_WITHDRAWAL}
          >
            <Banknote className="h-4 w-4" /> Withdraw
          </Button>
        </div>
      </div>

      {/* ── Pending / active withdrawal warning ── */}
      {hasPendingWithdrawal && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <Clock className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-800">Withdrawal in Progress</p>
            <p className="text-xs text-amber-700/80 mt-0.5">
              You have a pending or processing withdrawal. New requests are locked until it completes.
            </p>
          </div>
        </div>
      )}

      {/* ── Balance cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <BalanceCard
          label="Available Balance"
          value={`KES ${wallet.available_balance.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`}
          icon={Wallet}
          color="text-green-600"
          bg="bg-green-50"
          sub={wallet.available_balance < MIN_WITHDRAWAL ? `Min. KES ${MIN_WITHDRAWAL} to withdraw` : 'Ready to withdraw'}
        />
        <BalanceCard
          label="Pending Payout"
          value={`KES ${wallet.pending_balance.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`}
          icon={Clock}
          color="text-amber-600"
          bg="bg-amber-50"
          sub="Being processed"
        />
        <BalanceCard
          label="Total Earned"
          value={`KES ${wallet.total_earned.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`}
          icon={TrendingUp}
          color="text-blue-600"
          bg="bg-blue-50"
          sub={`${commissionPct}% commission rate`}
        />
        <BalanceCard
          label="Total Withdrawn"
          value={`KES ${wallet.total_withdrawn.toLocaleString('en-KE', { minimumFractionDigits: 2 })}`}
          icon={ArrowUpCircle}
          color="text-purple-600"
          bg="bg-purple-50"
          sub="Paid out to M-Pesa"
        />
      </div>

      {/* ── Commission info banner ── */}
      <div className="flex items-start gap-3 bg-primary/5 border border-primary/15 rounded-xl p-4">
        <Info className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
        <p className="text-sm text-foreground/80 leading-relaxed">
          You earn <strong>{commissionPct}%</strong> of every sale of your content.
          The remaining {100 - commissionPct}% goes to the Intercen Books platform.
          Commissions are credited to your wallet automatically after each confirmed purchase.
        </p>
      </div>

      {/* ── Earnings per content ── */}
      {earnings.length > 0 && (
        <Card className="shadow-soft overflow-hidden">
          <div className="p-4 border-b flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <h3 className="font-medium text-sm">Earnings by Title</h3>
            <span className="ml-auto text-xs text-muted-foreground">{earnings.length} titles</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/20 text-muted-foreground text-xs">
                  <th className="text-left px-4 py-2.5 font-medium">Title</th>
                  <th className="text-left px-4 py-2.5 font-medium">Type</th>
                  <th className="text-right px-4 py-2.5 font-medium">Sales</th>
                  <th className="text-right px-4 py-2.5 font-medium">Earned</th>
                  <th className="text-right px-4 py-2.5 font-medium">Last Sale</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {earnings.map(e => (
                  <tr key={e.content_id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {e.cover_image_url ? (
                          <img src={e.cover_image_url} alt="" className="h-8 w-6 object-cover rounded border flex-shrink-0" />
                        ) : (
                          <div className="h-8 w-6 bg-muted rounded border flex items-center justify-center flex-shrink-0">
                            <BookOpen className="h-3 w-3 text-muted-foreground" />
                          </div>
                        )}
                        <button
                          onClick={() => navigate(`/content/${e.content_id}`)}
                          className="font-medium text-sm hover:text-primary transition-colors text-left line-clamp-1 max-w-[200px]"
                        >
                          {e.content_title}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs capitalize bg-muted px-2 py-0.5 rounded text-muted-foreground">{e.content_type}</span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium">{e.sale_count.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-bold text-green-700">
                      KES {e.total_earned.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                      {new Date(e.last_sale_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t bg-muted/30">
                  <td className="px-4 py-2.5 font-semibold text-xs text-muted-foreground" colSpan={2}>TOTAL</td>
                  <td className="px-4 py-2.5 text-right font-semibold tabular-nums">
                    {earnings.reduce((s, e) => s + e.sale_count, 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 text-right font-bold text-green-700 tabular-nums">
                    KES {earnings.reduce((s, e) => s + e.total_earned, 0)
                      .toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}

      {/* ── Withdrawal history ── */}
      {withdrawals.length > 0 && (
        <Card className="shadow-soft overflow-hidden">
          <button
            className="w-full p-4 border-b flex items-center gap-2 hover:bg-muted/20 transition-colors text-left"
            onClick={() => setShowWdHistory(v => !v)}
          >
            <CreditCard className="h-4 w-4 text-primary" />
            <h3 className="font-medium text-sm flex-1">Withdrawal History</h3>
            <span className="text-xs text-muted-foreground mr-2">{withdrawals.length} requests</span>
            {showWdHistory ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>

          {showWdHistory && (
            <div className="divide-y">
              {withdrawals.map(wd => {
                const cfg = WD_STATUS_CONFIG[wd.status] || WD_STATUS_CONFIG.pending;
                const StatusIcon = cfg.icon;
                return (
                  <div key={wd.id} className="px-4 py-3 hover:bg-muted/10 transition-colors">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm">
                              KES {parseFloat(String(wd.amount)).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                            </span>
                            <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium flex items-center gap-1 ${cfg.color}`}>
                              <StatusIcon className="h-3 w-3" />
                              {cfg.label}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            M-Pesa → {displayPhone(wd.mpesa_phone)}
                            {wd.mpesa_name && ` · ${wd.mpesa_name}`}
                          </p>
                          {wd.mpesa_transaction_id && (
                            <p className="text-xs text-green-700 mt-0.5">
                              TxID: {wd.mpesa_transaction_id}
                            </p>
                          )}
                          {wd.mpesa_result_desc && wd.status === 'failed' && (
                            <p className="text-xs text-red-600 mt-0.5">{wd.mpesa_result_desc}</p>
                          )}
                          {wd.admin_notes && (
                            <p className="text-xs text-muted-foreground italic mt-0.5">Note: {wd.admin_notes}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-muted-foreground">
                          {new Date(wd.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                        {wd.completed_at && (
                          <p className="text-xs text-green-600 mt-0.5">
                            Paid {new Date(wd.completed_at).toLocaleDateString('en-KE')}
                          </p>
                        )}
                        {wd.failed_at && (
                          <p className="text-xs text-red-600 mt-0.5">
                            Failed {new Date(wd.failed_at).toLocaleDateString('en-KE')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* ── Transaction ledger ── */}
      <Card className="shadow-soft overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between gap-3 flex-wrap">
          <h3 className="font-medium text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" /> Transaction History
          </h3>
          <div className="flex gap-1">
            {(['all', 'credits', 'debits'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => { setTxTab(tab); setTxPage(0); }}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors capitalize ${
                  txTab === tab
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-muted-foreground border-border hover:border-foreground/30'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {transactions.length === 0 ? (
          <div className="p-12 text-center">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No transactions yet.</p>
          </div>
        ) : filteredTx.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-muted-foreground">No {txTab} transactions.</p>
          </div>
        ) : (
          <>
            <div className="divide-y">
              {visibleTx.map(tx => {
                const cfg    = TX_TYPE_CONFIG[tx.type] || TX_TYPE_CONFIG.commission_credit;
                const TxIcon = cfg.icon;
                const isCredit = cfg.sign === '+';

                return (
                  <div key={tx.id} className="px-4 py-3 hover:bg-muted/10 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`h-9 w-9 rounded-full ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
                        <TxIcon className={`h-4 w-4 ${cfg.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{cfg.label}</span>
                          {tx.status !== 'completed' && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium capitalize ${
                              tx.status === 'pending'  ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              tx.status === 'failed'   ? 'bg-red-50 text-red-700 border-red-200' :
                              tx.status === 'reversed' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                              'bg-gray-100 text-gray-600 border-gray-200'
                            }`}>
                              {tx.status}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-xs">
                          {tx.description || cfg.label}
                        </p>
                        {tx.metadata?.sale_amount && (
                          <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                            Sale: KES {parseFloat(tx.metadata.sale_amount).toLocaleString()} ·
                            Rate: {Math.round(parseFloat(tx.metadata.commission_rate) * 100)}%
                          </p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-sm font-bold tabular-nums ${isCredit ? 'text-green-600' : 'text-orange-600'}`}>
                          {cfg.sign}KES {tx.amount.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Bal: {tx.balance_after.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {new Date(tx.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Load more */}
            {visibleTx.length < filteredTx.length && (
              <div className="p-3 border-t text-center">
                <button
                  onClick={() => setTxPage(p => p + 1)}
                  className="text-xs text-primary hover:underline"
                >
                  Load more ({filteredTx.length - visibleTx.length} remaining)
                </button>
              </div>
            )}
          </>
        )}
      </Card>

      {/* ──────────────────────────── WITHDRAW DIALOG ──────────────────────── */}
      {showWithdrawDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <Card className="p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <Banknote className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-base">Request Withdrawal</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Available: KES {wallet.available_balance.toLocaleString('en-KE', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Amount */}
              <div className="space-y-1">
                <label className="text-sm font-medium">Amount (KES)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">KES</span>
                  <Input
                    type="number"
                    min={MIN_WITHDRAWAL}
                    max={wallet.available_balance}
                    step="1"
                    value={wdAmount}
                    onChange={e => setWdAmount(e.target.value)}
                    placeholder={`${MIN_WITHDRAWAL}–${Math.floor(wallet.available_balance)}`}
                    className="pl-12"
                    disabled={wdSubmitting}
                  />
                </div>
                <div className="flex gap-2 mt-1">
                  {[500, 1000, 5000].filter(v => v <= wallet.available_balance).map(v => (
                    <button
                      key={v}
                      onClick={() => setWdAmount(String(v))}
                      className="text-xs px-2.5 py-1 rounded-full border border-primary/30 text-primary hover:bg-primary/5 transition-colors"
                    >
                      {v.toLocaleString()}
                    </button>
                  ))}
                  <button
                    onClick={() => setWdAmount(String(Math.floor(wallet.available_balance)))}
                    className="text-xs px-2.5 py-1 rounded-full border border-primary/30 text-primary hover:bg-primary/5 transition-colors"
                  >
                    Max
                  </button>
                </div>
              </div>

              {/* M-Pesa phone */}
              <div className="space-y-1">
                <label className="text-sm font-medium">M-Pesa Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="tel"
                    value={wdPhone}
                    onChange={e => setWdPhone(e.target.value)}
                    placeholder="0712 345 678"
                    className="pl-9"
                    disabled={wdSubmitting}
                  />
                </div>
                {wdPhone && normalisePhone(wdPhone) && (
                  <p className="text-xs text-green-600 mt-0.5">
                    ✓ Will send to: {displayPhone(normalisePhone(wdPhone)!)}
                  </p>
                )}
              </div>

              {/* M-Pesa registered name */}
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  M-Pesa Registered Name
                  <span className="text-muted-foreground font-normal ml-1">(optional)</span>
                </label>
                <Input
                  value={wdName}
                  onChange={e => setWdName(e.target.value)}
                  placeholder="Name on M-Pesa account"
                  disabled={wdSubmitting}
                />
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Notes to Admin
                  <span className="text-muted-foreground font-normal ml-1">(optional)</span>
                </label>
                <Textarea
                  value={wdNotes}
                  onChange={e => setWdNotes(e.target.value)}
                  placeholder="Any additional info…"
                  rows={2}
                  disabled={wdSubmitting}
                />
              </div>

              {/* Info note */}
              <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg p-3">
                <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700 leading-relaxed">
                  Your request will be sent to the admin who will initiate the M-Pesa B2C transfer.
                  Processing typically takes a few hours on business days.
                </p>
              </div>

              {/* Error */}
              {wdError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg p-3">
                  <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{wdError}</p>
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <Button
                variant="outline"
                onClick={() => { setShowWithdrawDialog(false); setWdError(''); }}
                disabled={wdSubmitting}
              >
                Cancel
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700 text-white gap-2"
                onClick={handleWithdraw}
                disabled={wdSubmitting}
              >
                {wdSubmitting ? (
                  <><div className="h-4 w-4 border-2 border-white/60 border-t-transparent rounded-full animate-spin" /> Submitting…</>
                ) : (
                  <><Banknote className="h-4 w-4" /> Submit Request</>
                )}
              </Button>
            </div>
          </Card>
        </div>
      )}

    </div>
  );
}