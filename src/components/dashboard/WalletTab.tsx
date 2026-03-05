import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { z } from "zod";
import { 
  Wallet, 
  Plus, 
  Copy, 
  CreditCard, 
  ArrowDownLeft, 
  ArrowUpRight,
  RefreshCw,
  ExternalLink,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  Send,
  AlertTriangle,
  Download,
  Key,
  Eye,
  EyeOff,
  ShieldAlert,
  Info,
  Zap,
  Hash,
  Timer,
  Database
} from "lucide-react";

type BlockchainNetwork = 'ethereum' | 'polygon' | 'bsc' | 'arbitrum' | 'optimism' | 'solana' | 'bitcoin' | 'tron';
type CryptoCurrency = 'ETH' | 'BTC' | 'SOL' | 'USDT' | 'USDC' | 'MATIC' | 'BNB' | 'TRX';
type TransactionType = 'deposit' | 'withdrawal' | 'usage_charge' | 'refund' | 'wert_purchase' | 'provider_earning';
type TransactionStatus = 'pending' | 'confirmed' | 'failed' | 'cancelled';

interface Wallet {
  id: string;
  user_id: string;
  balance_usd: number;
  created_at: string;
  updated_at: string;
}

interface DepositAddress {
  id: string;
  network: BlockchainNetwork;
  address: string;
  created_at: string;
  key_exported?: boolean;
}

interface WalletTransaction {
  id: string;
  transaction_type: TransactionType;
  status: TransactionStatus;
  amount_crypto: number;
  currency: CryptoCurrency | null;
  network: BlockchainNetwork | null;
  amount_usd: number;
  tx_hash: string | null;
  created_at: string;
  metadata?: unknown;
}

interface UsageChargeDetail {
  id: string;
  endpoint: string;
  model: string | null;
  tokens_used: number;
  compute_time_ms: number;
  cost_usd: number;
  created_at: string;
}

const networkConfig: Record<BlockchainNetwork, { name: string; icon: string; color: string; tokens: CryptoCurrency[] }> = {
  ethereum: { name: 'Ethereum', icon: '⟠', color: 'bg-blue-500', tokens: ['ETH', 'USDT', 'USDC'] },
  polygon: { name: 'Polygon', icon: '⬡', color: 'bg-purple-500', tokens: ['MATIC', 'USDT', 'USDC'] },
  bsc: { name: 'BNB Chain', icon: '◆', color: 'bg-yellow-500', tokens: ['BNB', 'USDT', 'USDC'] },
  arbitrum: { name: 'Arbitrum', icon: '◈', color: 'bg-blue-400', tokens: ['ETH', 'USDT', 'USDC'] },
  optimism: { name: 'Optimism', icon: '○', color: 'bg-red-500', tokens: ['ETH', 'USDT', 'USDC'] },
  solana: { name: 'Solana', icon: '◎', color: 'bg-gradient-to-r from-purple-500 to-green-400', tokens: ['SOL', 'USDT', 'USDC'] },
  bitcoin: { name: 'Bitcoin', icon: '₿', color: 'bg-orange-500', tokens: ['BTC'] },
  tron: { name: 'Tron', icon: '◉', color: 'bg-red-600', tokens: ['TRX', 'USDT'] },
};

const statusConfig: Record<TransactionStatus, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  pending: { label: 'Pending', icon: Clock, color: 'text-yellow-500' },
  confirmed: { label: 'Confirmed', icon: CheckCircle2, color: 'text-green-500' },
  failed: { label: 'Failed', icon: XCircle, color: 'text-red-500' },
  cancelled: { label: 'Cancelled', icon: XCircle, color: 'text-muted-foreground' },
};

// Address validation patterns per network
const addressPatterns: Record<BlockchainNetwork, RegExp> = {
  ethereum: /^0x[a-fA-F0-9]{40}$/,
  polygon: /^0x[a-fA-F0-9]{40}$/,
  bsc: /^0x[a-fA-F0-9]{40}$/,
  arbitrum: /^0x[a-fA-F0-9]{40}$/,
  optimism: /^0x[a-fA-F0-9]{40}$/,
  solana: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
  bitcoin: /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,39}$/,
  tron: /^T[a-zA-Z0-9]{33}$/,
};

const withdrawalSchema = z.object({
  network: z.enum(['ethereum', 'polygon', 'bsc', 'arbitrum', 'optimism', 'solana', 'bitcoin', 'tron']),
  currency: z.enum(['ETH', 'BTC', 'SOL', 'USDT', 'USDC', 'MATIC', 'BNB', 'TRX']),
  address: z.string().min(26).max(64),
  amount: z.number().positive().min(1),
});

interface ProjectWallet {
  id: string;
  network: string;
  address: string;
  label: string;
  currency: string;
  is_active: boolean;
}

const TX_PER_PAGE = 10;

const WalletTab = () => {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [depositAddresses, setDepositAddresses] = useState<DepositAddress[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [txPage, setTxPage] = useState(1);
  const [txTotal, setTxTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generatingAddress, setGeneratingAddress] = useState<BlockchainNetwork | null>(null);
  const [depositDialogOpen, setDepositDialogOpen] = useState(false);
  const [cardDialogOpen, setCardDialogOpen] = useState(false);
  const [cardProvider, setCardProvider] = useState<'wert' | 'stripe' | null>(null);
  const [wertLoading, setWertLoading] = useState(false);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeAmount, setStripeAmount] = useState('25');

  // Project wallets (centralized)
  const [projectWallets, setProjectWallets] = useState<ProjectWallet[]>([]);
  
  // Withdrawal state
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawNetwork, setWithdrawNetwork] = useState<BlockchainNetwork>('ethereum');
  const [withdrawCurrency, setWithdrawCurrency] = useState<CryptoCurrency>('USDT');
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawErrors, setWithdrawErrors] = useState<{ address?: string; amount?: string }>({});

  // Export keys state
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportingAddressId, setExportingAddressId] = useState<string | null>(null);
  const [exportedKey, setExportedKey] = useState<{ network: string; address: string; private_key: string } | null>(null);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [exportConfirmed, setExportConfirmed] = useState(false);

  // Crypto prices state
  const [cryptoPrices, setCryptoPrices] = useState<Record<string, number>>({});
  const [pricesLoading, setPricesLoading] = useState(false);

  // Usage charge detail dialog state
  const [usageDetailTx, setUsageDetailTx] = useState<WalletTransaction | null>(null);
  const [usageDetail, setUsageDetail] = useState<UsageChargeDetail | null>(null);
  const [usageDetailLoading, setUsageDetailLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchWalletData(1);
      fetchCryptoPrices();
      fetchProjectWallets();
    }
  }, [user]);

  const fetchProjectWallets = async () => {
    const { data } = await supabase
      .from('project_wallets' as any)
      .select('*')
      .eq('is_active', true)
      .order('network');
    setProjectWallets((data as unknown as ProjectWallet[]) || []);
  };

  const fetchCryptoPrices = async () => {
    setPricesLoading(true);
    try {
      const response = await supabase.functions.invoke('crypto-prices');
      if (response.error) throw response.error;
      setCryptoPrices(response.data?.prices || {});
    } catch (error) {
      console.error('Error fetching crypto prices:', error);
    } finally {
      setPricesLoading(false);
    }
  };

  const fetchWalletData = async (page = 1) => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch or create wallet
      let { data: walletData, error: walletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (walletError && walletError.code === 'PGRST116') {
        const { data: newWallet, error: createError } = await supabase
          .from('wallets')
          .insert({ user_id: user.id })
          .select()
          .single();

        if (createError) throw createError;
        walletData = newWallet;
      } else if (walletError) {
        throw walletError;
      }

      setWallet(walletData);

      // Fetch deposit addresses
      const { data: addresses, error: addressError } = await supabase
        .from('wallet_deposit_addresses')
        .select('*')
        .eq('user_id', user.id);

      if (addressError) throw addressError;
      setDepositAddresses(addresses || []);

      // Fetch transactions with pagination
      const from = (page - 1) * TX_PER_PAGE;
      const to = from + TX_PER_PAGE - 1;

      const { data: txs, error: txError, count } = await supabase
        .from('wallet_transactions')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (txError) throw txError;
      setTransactions(txs || []);
      setTxTotal(count || 0);
      setTxPage(page);
    } catch (error: any) {
      console.error('Error fetching wallet data:', error);
      toast.error('Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  };

  const generateDepositAddress = async (network: BlockchainNetwork) => {
    if (!user || !wallet) return;
    
    setGeneratingAddress(network);
    try {
      const response = await supabase.functions.invoke('generate-deposit-address', {
        body: { network, wallet_id: wallet.id }
      });

      if (response.error) throw response.error;
      
      toast.success(`${networkConfig[network].name} deposit address generated`);
      fetchWalletData();
    } catch (error: any) {
      console.error('Error generating address:', error);
      toast.error('Failed to generate deposit address');
    } finally {
      setGeneratingAddress(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Address copied to clipboard');
  };

  const openWertWidget = async () => {
    if (!user || !wallet) return;
    
    setWertLoading(true);
    try {
      const response = await supabase.functions.invoke('wert-widget', {
        body: { 
          wallet_id: wallet.id,
          user_email: user.email
        }
      });

      if (response.error) throw response.error;
      if (response.data?.error) throw new Error(response.data.error);
      
      const { session_id, partner_id, click_id } = response.data;

      const { default: WertWidget } = await import('@wert-io/widget-initializer');
      const wertWidget = new WertWidget({
        partner_id,
        session_id,
        click_id,
        listeners: {
          loaded: () => console.log('Wert widget loaded'),
          'payment-status': (data: { status: string }) => {
            switch (data.status) {
              case 'pending': toast.info('Payment is being processed...'); break;
              case 'success':
                toast.success('Payment successful! Your balance will update shortly.');
                fetchWalletData();
                break;
              case 'failed': toast.error('Payment failed. Please try again.'); break;
              case 'canceled': toast.info('Payment was cancelled.'); break;
            }
          },
          close: () => console.log('Wert widget closed'),
          error: (data: { name: string; message: string }) => {
            toast.error(`Widget error: ${data.message}`);
          },
        },
      });
      
      wertWidget.open();
      setCardDialogOpen(false);
      setCardProvider(null);
    } catch (error: any) {
      console.error('Error opening Wert widget:', error);
      toast.error(error.message || 'Failed to open Wert.io widget');
    } finally {
      setWertLoading(false);
    }
  };

  const openStripeCheckout = async () => {
    if (!user || !wallet) return;
    
    const amount = parseFloat(stripeAmount);
    if (isNaN(amount) || amount < 5 || amount > 10000) {
      toast.error('Amount must be between $5 and $10,000');
      return;
    }

    setStripeLoading(true);
    try {
      const response = await supabase.functions.invoke('stripe-checkout', {
        body: { amount_usd: amount }
      });

      if (response.error) throw response.error;
      if (response.data?.error) throw new Error(response.data.error);

      const { url } = response.data;
      if (url) {
        window.open(url, '_blank');
        setCardDialogOpen(false);
        setCardProvider(null);
        toast.info('Stripe checkout opened in a new tab');
      }
    } catch (error: any) {
      console.error('Stripe checkout error:', error);
      toast.error(error.message || 'Failed to open Stripe checkout');
    } finally {
      setStripeLoading(false);
    }
  };

  const getAddressForNetwork = (network: BlockchainNetwork) => {
    return depositAddresses.find(addr => addr.network === network);
  };

  const validateWithdrawAddress = (addr: string, network: BlockchainNetwork): boolean => {
    const pattern = addressPatterns[network];
    return pattern.test(addr);
  };

  const handleWithdrawNetworkChange = (network: BlockchainNetwork) => {
    setWithdrawNetwork(network);
    // Set default currency for the network
    const tokens = networkConfig[network].tokens;
    if (!tokens.includes(withdrawCurrency)) {
      setWithdrawCurrency(tokens[0]);
    }
    // Clear address error if network changes
    setWithdrawErrors(prev => ({ ...prev, address: undefined }));
  };

  const handleWithdrawSubmit = async () => {
    if (!user || !wallet) return;

    // Reset errors
    setWithdrawErrors({});

    // Validate address
    if (!withdrawAddress.trim()) {
      setWithdrawErrors(prev => ({ ...prev, address: 'Address is required' }));
      return;
    }

    if (!validateWithdrawAddress(withdrawAddress, withdrawNetwork)) {
      setWithdrawErrors(prev => ({ ...prev, address: `Invalid ${networkConfig[withdrawNetwork].name} address format` }));
      return;
    }

    // Validate amount
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount < 1) {
      setWithdrawErrors(prev => ({ ...prev, amount: 'Minimum withdrawal is $1' }));
      return;
    }

    if (amount > (wallet.balance_usd || 0)) {
      setWithdrawErrors(prev => ({ ...prev, amount: 'Insufficient balance' }));
      return;
    }

    setWithdrawLoading(true);
    try {
      const response = await supabase.functions.invoke('request-withdrawal', {
        body: {
          wallet_id: wallet.id,
          network: withdrawNetwork,
          currency: withdrawCurrency,
          address: withdrawAddress.trim(),
          amount_usd: amount
        }
      });

      if (response.error) throw response.error;
      if (response.data?.error) throw new Error(response.data.error);

      toast.success('Withdrawal request submitted successfully');
      setWithdrawDialogOpen(false);
      setWithdrawAddress('');
      setWithdrawAmount('');
      fetchWalletData();
    } catch (error: any) {
      console.error('Withdrawal error:', error);
      toast.error(error.message || 'Failed to submit withdrawal request');
    } finally {
      setWithdrawLoading(false);
    }
  };

  const handleExportKeys = async (addressId: string) => {
    setExportingAddressId(addressId);
    try {
      const response = await supabase.functions.invoke('export-wallet-keys', {
        body: { address_id: addressId }
      });

      if (response.error) throw response.error;
      if (response.data?.error) throw new Error(response.data.error);

      setExportedKey(response.data);
      setShowPrivateKey(false);
      fetchWalletData(); // Refresh to update key_exported status
    } catch (error: any) {
      console.error('Export keys error:', error);
      toast.error(error.message || 'Failed to export wallet keys');
    } finally {
      setExportingAddressId(null);
    }
  };

  const downloadKeysAsFile = () => {
    if (!exportedKey) return;
    
    const content = `ReGraph Wallet Export
====================
Network: ${exportedKey.network}
Address: ${exportedKey.address}
Private Key: ${exportedKey.private_key}

⚠️ WARNING: Keep this file secure! 
Anyone with access to the private key can control your funds.
Do not share this file with anyone.

Generated: ${new Date().toISOString()}
`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `regraph-wallet-${exportedKey.network}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Wallet keys downloaded');
  };

  const resetExportDialog = () => {
    setExportDialogOpen(false);
    setExportedKey(null);
    setShowPrivateKey(false);
    setExportConfirmed(false);
  };

  const openUsageDetail = async (tx: WalletTransaction) => {
    setUsageDetailTx(tx);
    setUsageDetail(null);
    setUsageDetailLoading(true);

    try {
      const meta = tx.metadata as Record<string, unknown> | null;
      const usageLogId = meta?.usage_log_id as string | undefined;

      // If metadata has explicit usage_log_id, use it directly
      if (usageLogId) {
        const { data } = await supabase
          .from('usage_logs')
          .select('id, endpoint, model, tokens_used, compute_time_ms, cost_usd, created_at')
          .eq('id', usageLogId)
          .limit(1);
        setUsageDetail((data?.[0] as UsageChargeDetail) || null);
        return;
      }

      // Otherwise match by timestamp proximity (±10 seconds window)
      // Note: transaction.amount_usd includes 20% markup, usage_logs.cost_usd is pre-markup
      const txTime = new Date(tx.created_at);
      const from = new Date(txTime.getTime() - 10_000).toISOString();
      const to = new Date(txTime.getTime() + 10_000).toISOString();

      const { data } = await supabase
        .from('usage_logs')
        .select('id, endpoint, model, tokens_used, compute_time_ms, cost_usd, created_at')
        .eq('user_id', user!.id)
        .gte('created_at', from)
        .lte('created_at', to)
        .order('created_at', { ascending: false })
        .limit(1);

      setUsageDetail((data?.[0] as UsageChargeDetail) || null);
    } catch (e) {
      console.error('Error fetching usage detail:', e);
    } finally {
      setUsageDetailLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Wallet Balance Card */}
      <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              <CardTitle>Wallet Balance</CardTitle>
            </div>
            <div className="flex items-center gap-3">
              {Object.keys(cryptoPrices).length > 0 && (
                <div className="hidden lg:flex items-center gap-3">
                  {[
                    { token: 'BTC', icon: '₿', color: 'text-orange-500' },
                    { token: 'ETH', icon: '⟠', color: 'text-blue-400' },
                    { token: 'SOL', icon: '◎', color: 'text-purple-400' }
                  ].map(({ token, icon, color }) => (
                    <div key={token} className="flex items-center gap-1">
                      <span className={`${color} text-xs font-bold`}>{icon}</span>
                      <span className="text-xs text-muted-foreground">
                        ${cryptoPrices[token]?.toLocaleString(undefined, { maximumFractionDigits: 0 }) || '—'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  fetchWalletData();
                  fetchCryptoPrices();
                }}
              >
                <RefreshCw className={`h-4 w-4 ${pricesLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Mobile/Tablet crypto prices */}
          {Object.keys(cryptoPrices).length > 0 && (
            <div className="flex lg:hidden items-center gap-4 mb-4 pb-3 border-b border-border/50">
              {[
                { token: 'BTC', icon: '₿', color: 'text-orange-500' },
                { token: 'ETH', icon: '⟠', color: 'text-blue-400' },
                { token: 'SOL', icon: '◎', color: 'text-purple-400' }
              ].map(({ token, icon, color }) => (
                <div key={token} className="flex items-center gap-1">
                  <span className={`${color} text-xs font-bold`}>{icon}</span>
                  <span className="text-xs text-muted-foreground">
                    ${cryptoPrices[token]?.toLocaleString(undefined, { maximumFractionDigits: 0 }) || '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <p className="text-4xl font-bold text-foreground">
                ${wallet?.balance_usd?.toFixed(2) || '0.00'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">Available for compute usage</p>
            </div>
            <div className="flex gap-2">
              <Dialog open={depositDialogOpen} onOpenChange={setDepositDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="aspect-square p-0 lg:aspect-auto lg:px-4 lg:py-2 lg:gap-2">
                    <Plus className="h-4 w-4" />
                    <span className="hidden lg:inline">Deposit Crypto</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto w-[calc(100vw-2rem)] sm:w-full">
                  <DialogHeader>
                    <DialogTitle>Deposit Cryptocurrency</DialogTitle>
                    <DialogDescription>
                      Send crypto to one of the addresses below. After sending, contact support with your transaction hash to credit your balance.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-3 mt-4">
                    {projectWallets.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <p className="text-sm">No deposit addresses configured yet.</p>
                        <p className="text-xs mt-1">Please contact support for deposit instructions.</p>
                      </div>
                    ) : (
                      projectWallets.map((pw) => {
                        const config = networkConfig[pw.network as BlockchainNetwork];
                        return (
                          <Card key={pw.id} className="border-border">
                            <CardContent className="p-3 sm:p-4">
                              <div className="flex flex-col gap-3">
                                {/* Network header */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 sm:gap-3">
                                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full ${config?.color || 'bg-muted'} flex items-center justify-center text-white text-sm sm:text-lg font-bold shrink-0`}>
                                      {config?.icon || '◉'}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="font-medium text-sm sm:text-base">{config?.name || pw.network}</p>
                                      <div className="flex items-center gap-1.5 mt-0.5">
                                        <Badge variant="secondary" className="text-[10px] sm:text-xs px-1.5 py-0">
                                          {pw.currency}
                                        </Badge>
                                        {pw.label && (
                                          <span className="text-xs text-muted-foreground">{pw.label}</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                {/* Address */}
                                <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-2">
                                  <code className="text-[10px] sm:text-xs break-all flex-1 font-mono">
                                    {pw.address}
                                  </code>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="shrink-0 h-8 w-8 p-0"
                                    onClick={() => copyToClipboard(pw.address)}
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })
                    )}
                    <div className="mt-2 p-3 rounded-lg bg-muted/40 text-xs text-muted-foreground space-y-1">
                      <p className="font-medium text-foreground">How to deposit:</p>
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Copy the address for your desired network above</li>
                        <li>Send crypto from your wallet</li>
                        <li>After the transaction confirms, contact support with your TX hash</li>
                        <li>Your balance will be credited manually</li>
                      </ol>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={cardDialogOpen} onOpenChange={(open) => { setCardDialogOpen(open); if (!open) setCardProvider(null); }}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="aspect-square p-0 lg:aspect-auto lg:px-4 lg:py-2 lg:gap-2">
                    <CreditCard className="h-4 w-4" />
                    <span className="hidden lg:inline">Buy with Card</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Top Up with Card</DialogTitle>
                    <DialogDescription>
                      Add funds to your balance using a credit or debit card
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    {!cardProvider ? (
                      <div className="grid gap-3">
                        <button
                          onClick={() => setCardProvider('stripe')}
                          className="flex items-center gap-4 p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-secondary/50 transition-colors text-left"
                        >
                          <div className="w-10 h-10 rounded-lg bg-[hsl(var(--primary)/0.1)] flex items-center justify-center shrink-0">
                            <CreditCard className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">Stripe</p>
                            <p className="text-sm text-muted-foreground">Pay with Visa, Mastercard, Apple Pay, Google Pay</p>
                          </div>
                        </button>
                        <button
                          onClick={() => setCardProvider('wert')}
                          className="flex items-center gap-4 p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-secondary/50 transition-colors text-left"
                        >
                          <div className="w-10 h-10 rounded-lg bg-[hsl(var(--primary)/0.1)] flex items-center justify-center shrink-0">
                            <Wallet className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">Wert.io</p>
                            <p className="text-sm text-muted-foreground">Buy crypto directly with your card</p>
                          </div>
                        </button>
                      </div>
                    ) : cardProvider === 'stripe' ? (
                      <div className="space-y-4">
                        <Button variant="ghost" size="sm" onClick={() => setCardProvider(null)} className="mb-2">
                          ← Back
                        </Button>
                        <div className="space-y-2">
                          <Label>Amount (USD)</Label>
                          <div className="flex gap-2">
                            {['10', '25', '50', '100'].map((val) => (
                              <Button
                                key={val}
                                variant={stripeAmount === val ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setStripeAmount(val)}
                              >
                                ${val}
                              </Button>
                            ))}
                          </div>
                          <Input
                            type="number"
                            min="5"
                            max="10000"
                            value={stripeAmount}
                            onChange={(e) => setStripeAmount(e.target.value)}
                            placeholder="Custom amount"
                          />
                        </div>
                        <Button
                          className="w-full gap-2"
                          onClick={openStripeCheckout}
                          disabled={stripeLoading}
                        >
                          {stripeLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <ExternalLink className="h-4 w-4" />
                              Pay ${stripeAmount || '0'} with Stripe
                            </>
                          )}
                        </Button>
                        <p className="text-xs text-muted-foreground text-center">
                          Secure payment powered by Stripe
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <Button variant="ghost" size="sm" onClick={() => setCardProvider(null)} className="mb-2">
                          ← Back
                        </Button>
                        <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <span className="text-sm">Instant purchase with Visa/Mastercard</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <span className="text-sm">No crypto wallet needed</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <span className="text-sm">Funds credited directly to your balance</span>
                          </div>
                        </div>
                        <Button
                          className="w-full gap-2"
                          onClick={openWertWidget}
                          disabled={wertLoading}
                        >
                          {wertLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <ExternalLink className="h-4 w-4" />
                              Open Wert.io Widget
                            </>
                          )}
                        </Button>
                        <p className="text-xs text-muted-foreground text-center">
                          Powered by Wert.io • Secure payment processing
                        </p>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="aspect-square p-0 lg:aspect-auto lg:px-4 lg:py-2 lg:gap-2">
                    <Send className="h-4 w-4" />
                    <span className="hidden lg:inline">Withdraw</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Withdraw Funds</DialogTitle>
                    <DialogDescription>
                      Withdraw your balance to an external crypto wallet
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    {/* Balance display */}
                    <div className="bg-muted/50 p-3 rounded-lg flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Available balance</span>
                      <span className="font-bold text-lg">${wallet?.balance_usd?.toFixed(2) || '0.00'}</span>
                    </div>

                    {/* Network selection */}
                    <div className="space-y-2">
                      <Label htmlFor="withdraw-network">Network</Label>
                      <Select 
                        value={withdrawNetwork} 
                        onValueChange={(val) => handleWithdrawNetworkChange(val as BlockchainNetwork)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(networkConfig) as BlockchainNetwork[]).map((network) => (
                            <SelectItem key={network} value={network}>
                              <div className="flex items-center gap-2">
                                <span>{networkConfig[network].icon}</span>
                                <span>{networkConfig[network].name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Currency selection */}
                    <div className="space-y-2">
                      <Label htmlFor="withdraw-currency">Currency</Label>
                      <Select 
                        value={withdrawCurrency} 
                        onValueChange={(val) => setWithdrawCurrency(val as CryptoCurrency)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {networkConfig[withdrawNetwork].tokens.map((token) => (
                            <SelectItem key={token} value={token}>
                              {token}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Destination address */}
                    <div className="space-y-2">
                      <Label htmlFor="withdraw-address">Destination Address</Label>
                      <Input
                        id="withdraw-address"
                        placeholder={`Enter ${networkConfig[withdrawNetwork].name} address`}
                        value={withdrawAddress}
                        onChange={(e) => {
                          setWithdrawAddress(e.target.value);
                          setWithdrawErrors(prev => ({ ...prev, address: undefined }));
                        }}
                        className={withdrawErrors.address ? 'border-destructive' : ''}
                      />
                      {withdrawErrors.address && (
                        <p className="text-sm text-destructive flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {withdrawErrors.address}
                        </p>
                      )}
                    </div>

                    {/* Amount */}
                    <div className="space-y-2">
                      <Label htmlFor="withdraw-amount">Amount (USD)</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                        <Input
                          id="withdraw-amount"
                          type="number"
                          min="1"
                          step="0.01"
                          placeholder="0.00"
                          value={withdrawAmount}
                          onChange={(e) => {
                            setWithdrawAmount(e.target.value);
                            setWithdrawErrors(prev => ({ ...prev, amount: undefined }));
                          }}
                          className={`pl-7 ${withdrawErrors.amount ? 'border-destructive' : ''}`}
                        />
                      </div>
                      {withdrawErrors.amount && (
                        <p className="text-sm text-destructive flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {withdrawErrors.amount}
                        </p>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={() => setWithdrawAmount(String(wallet?.balance_usd || 0))}
                      >
                        Max
                      </Button>
                    </div>

                    {/* Warning */}
                    <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                        <p className="text-xs text-muted-foreground">
                          Withdrawals are processed within 24 hours. Double-check the address - 
                          transactions cannot be reversed.
                        </p>
                      </div>
                    </div>

                    {/* Submit button */}
                    <Button 
                      className="w-full gap-2" 
                      onClick={handleWithdrawSubmit}
                      disabled={withdrawLoading || !withdrawAddress || !withdrawAmount}
                    >
                      {withdrawLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          Request Withdrawal
                        </>
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export Keys Dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={(open) => !open && resetExportDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              Export Wallet Keys
            </DialogTitle>
            <DialogDescription>
              Export your private keys to use with external wallet software
            </DialogDescription>
          </DialogHeader>
          
          {!exportedKey ? (
            <div className="space-y-4 mt-4">
              <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                  <div className="space-y-2">
                    <p className="font-medium text-destructive">Security Warning</p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Anyone with your private key can control your funds</li>
                      <li>• Never share your private keys with anyone</li>
                      <li>• Store exported keys in a secure location</li>
                      <li>• ReGraph will not be able to recover lost keys</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="export-confirm"
                  checked={exportConfirmed}
                  onChange={(e) => setExportConfirmed(e.target.checked)}
                  className="rounded border-input"
                />
                <Label htmlFor="export-confirm" className="text-sm cursor-pointer">
                  I understand the risks and want to export my keys
                </Label>
              </div>

              <div className="space-y-2">
                <Label>Select wallet to export</Label>
                {depositAddresses.map((addr) => {
                  const config = networkConfig[addr.network];
                  return (
                    <Button
                      key={addr.id}
                      variant="outline"
                      className="w-full justify-between"
                      disabled={!exportConfirmed || exportingAddressId === addr.id}
                      onClick={() => handleExportKeys(addr.id)}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full ${config.color} flex items-center justify-center text-white text-xs font-bold`}>
                          {config.icon}
                        </div>
                        <span>{config.name}</span>
                        {addr.key_exported && (
                          <Badge variant="secondary" className="text-xs">Exported</Badge>
                        )}
                      </div>
                      {exportingAddressId === addr.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                    </Button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-4 mt-4">
              <div className="bg-muted/50 p-3 rounded-lg space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Network</Label>
                  <p className="font-medium capitalize">{exportedKey.network}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Address</Label>
                  <code className="text-xs block break-all">{exportedKey.address}</code>
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">Private Key</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2"
                      onClick={() => setShowPrivateKey(!showPrivateKey)}
                    >
                      {showPrivateKey ? (
                        <EyeOff className="h-3 w-3" />
                      ) : (
                        <Eye className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                  <code className="text-xs block break-all font-mono bg-background p-2 rounded mt-1">
                    {showPrivateKey ? exportedKey.private_key : '•'.repeat(64)}
                  </code>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={() => {
                    navigator.clipboard.writeText(exportedKey.private_key);
                    toast.success('Private key copied');
                  }}
                >
                  <Copy className="h-4 w-4" />
                  Copy Key
                </Button>
                <Button
                  className="flex-1 gap-2"
                  onClick={downloadKeysAsFile}
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  <AlertTriangle className="h-3 w-3 inline mr-1" />
                  Store this securely. We cannot recover your keys if lost.
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>


      {/* Transaction History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Transaction History</CardTitle>
              <CardDescription>
                {txTotal > 0 ? `${txTotal} transaction${txTotal !== 1 ? 's' : ''} total` : 'Your recent wallet transactions'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 && txPage === 1 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Wallet className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No transactions yet</p>
              <p className="text-sm">Make your first deposit to get started</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {transactions.map((tx) => {
                  const statusInfo = statusConfig[tx.status];
                  const StatusIcon = statusInfo.icon;
                  const isIncome = tx.transaction_type === 'deposit' || tx.transaction_type === 'wert_purchase' || tx.transaction_type === 'refund' || tx.transaction_type === 'provider_earning';
                  const isUsageCharge = tx.transaction_type === 'usage_charge';
                  
                  return (
                    <div 
                      key={tx.id}
                      onClick={isUsageCharge ? () => openUsageDetail(tx) : undefined}
                      className={`flex items-center justify-between p-3 bg-muted/30 rounded-lg transition-colors ${
                        isUsageCharge ? 'cursor-pointer hover:bg-muted/60' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          isIncome ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                        }`}>
                          {isIncome ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="font-medium capitalize">
                              {tx.transaction_type.replace(/_/g, ' ')}
                            </p>
                            {isUsageCharge && (
                              <Info className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {tx.network && (
                              <Badge variant="secondary" className="text-xs">
                                {networkConfig[tx.network]?.name || tx.network}
                              </Badge>
                            )}
                            {tx.currency && (
                              <span>{tx.amount_crypto} {tx.currency}</span>
                            )}
                            {(tx.network || tx.currency) && <span>•</span>}
                            <span>{new Date(tx.created_at).toLocaleDateString()} {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-medium ${isIncome ? 'text-green-500' : 'text-red-500'}`}>
                          {isIncome ? '+' : '-'}${tx.amount_usd.toFixed(4)}
                        </p>
                        <div className={`flex items-center gap-1 text-xs ${statusInfo.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          <span>{statusInfo.label}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>


              {/* Pagination */}
              {txTotal > TX_PER_PAGE && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                  <span className="text-sm text-muted-foreground">
                    Page {txPage} of {Math.ceil(txTotal / TX_PER_PAGE)}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={txPage <= 1}
                      onClick={() => fetchWalletData(txPage - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={txPage >= Math.ceil(txTotal / TX_PER_PAGE)}
                      onClick={() => fetchWalletData(txPage + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Usage Charge Detail Dialog */}
      <Dialog open={!!usageDetailTx} onOpenChange={(open) => { if (!open) { setUsageDetailTx(null); setUsageDetail(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Usage Charge Details
            </DialogTitle>
            <DialogDescription>
              {usageDetailTx && (
                <>Charged on {new Date(usageDetailTx.created_at).toLocaleDateString()} at {new Date(usageDetailTx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</>
              )}
            </DialogDescription>
          </DialogHeader>

          {usageDetailLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : usageDetail ? (
            <div className="space-y-4 mt-2">
              {/* Amount */}
              <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg">
                <span className="text-sm text-muted-foreground font-medium">Amount Charged</span>
                <span className="text-lg font-bold text-red-500">-${usageDetailTx?.amount_usd.toFixed(4)}</span>
              </div>

              <Separator />

              {/* Endpoint */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                  <Hash className="h-3.5 w-3.5" />
                  Endpoint
                </div>
                <code className="block text-sm bg-muted/50 px-3 py-2 rounded-md break-all font-mono">
                  {usageDetail.endpoint}
                </code>
              </div>

              {/* Model */}
              {usageDetail.model && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                    <Database className="h-3.5 w-3.5" />
                    Model
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="font-mono text-sm">
                      {usageDetail.model}
                    </Badge>
                  </div>
                </div>
              )}

              <Separator />

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-muted/40 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Tokens</p>
                  <p className="font-semibold text-sm">{usageDetail.tokens_used.toLocaleString()}</p>
                </div>
                <div className="text-center p-3 bg-muted/40 rounded-lg">
                  <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
                    <Timer className="h-3 w-3" />
                    Latency
                  </div>
                  <p className="font-semibold text-sm">{usageDetail.compute_time_ms}ms</p>
                </div>
                <div className="text-center p-3 bg-muted/40 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Cost</p>
                  <p className="font-semibold text-sm">${usageDetail.cost_usd.toFixed(4)}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No detailed usage data found for this charge.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WalletTab;
