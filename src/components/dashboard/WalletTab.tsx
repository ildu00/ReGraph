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
  ShieldAlert
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

const WalletTab = () => {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [depositAddresses, setDepositAddresses] = useState<DepositAddress[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingAddress, setGeneratingAddress] = useState<BlockchainNetwork | null>(null);
  const [depositDialogOpen, setDepositDialogOpen] = useState(false);
  const [wertDialogOpen, setWertDialogOpen] = useState(false);
  const [wertLoading, setWertLoading] = useState(false);
  
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

  useEffect(() => {
    if (user) {
      fetchWalletData();
      fetchCryptoPrices();
    }
  }, [user]);

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

  const fetchWalletData = async () => {
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
        // Wallet doesn't exist, create one
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

      // Fetch transactions
      const { data: txs, error: txError } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (txError) throw txError;
      setTransactions(txs || []);
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
      
      const { widget_url } = response.data;
      
      // Open Wert widget in a new window
      window.open(widget_url, 'wert-widget', 'width=600,height=700');
      setWertDialogOpen(false);
      toast.success('Wert.io widget opened. Complete your purchase there.');
    } catch (error: any) {
      console.error('Error opening Wert widget:', error);
      toast.error('Failed to open Wert.io widget');
    } finally {
      setWertLoading(false);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
                <div className="hidden sm:flex items-center gap-3">
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
            <div className="flex sm:hidden items-center gap-4 mb-4 pb-3 border-b border-border/50">
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
                      Send crypto to your unique deposit address. Your balance will be credited after confirmations.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-3 mt-4">
                    {(Object.keys(networkConfig) as BlockchainNetwork[]).map((network) => {
                      const config = networkConfig[network];
                      const existingAddress = getAddressForNetwork(network);
                      
                      return (
                        <Card key={network} className="border-border">
                          <CardContent className="p-3 sm:p-4">
                            <div className="flex flex-col gap-3">
                              {/* Network header row */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 sm:gap-3">
                                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full ${config.color} flex items-center justify-center text-white text-sm sm:text-lg font-bold shrink-0`}>
                                    {config.icon}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-medium text-sm sm:text-base">{config.name}</p>
                                    <div className="flex flex-wrap gap-1 mt-0.5">
                                      {config.tokens.map(token => (
                                        <Badge key={token} variant="secondary" className="text-[10px] sm:text-xs px-1.5 py-0">
                                          {token}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                                
                                {!existingAddress && (
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    className="shrink-0 text-xs sm:text-sm"
                                    onClick={() => generateDepositAddress(network)}
                                    disabled={generatingAddress === network}
                                  >
                                    {generatingAddress === network ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      'Generate'
                                    )}
                                  </Button>
                                )}
                              </div>
                              
                              {/* Address row - only shown when address exists */}
                              {existingAddress && (
                                <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-2">
                                  <code className="text-[10px] sm:text-xs break-all flex-1 font-mono">
                                    {existingAddress.address}
                                  </code>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="shrink-0 h-8 w-8 p-0"
                                    onClick={() => copyToClipboard(existingAddress.address)}
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={wertDialogOpen} onOpenChange={setWertDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="aspect-square p-0 lg:aspect-auto lg:px-4 lg:py-2 lg:gap-2">
                    <CreditCard className="h-4 w-4" />
                    <span className="hidden lg:inline">Buy with Card</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Buy Crypto with Card</DialogTitle>
                    <DialogDescription>
                      Purchase cryptocurrency instantly using your credit or debit card via Wert.io
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
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

      {/* Deposit Addresses Quick View */}
      {depositAddresses.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Your Deposit Addresses</CardTitle>
                <CardDescription>Send crypto to these addresses to top up your balance</CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                className="gap-2"
                onClick={() => setExportDialogOpen(true)}
              >
                <Key className="h-4 w-4" />
                Export Keys
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {depositAddresses.map((addr) => {
                const config = networkConfig[addr.network];
                return (
                  <div 
                    key={addr.id} 
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full ${config.color} flex items-center justify-center text-white text-sm font-bold`}>
                        {config.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{config.name}</p>
                          {addr.key_exported && (
                            <Badge variant="secondary" className="text-[10px]">Key exported</Badge>
                          )}
                        </div>
                        <code className="text-xs text-muted-foreground max-w-[180px] truncate block">
                          {addr.address}
                        </code>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => copyToClipboard(addr.address)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Transaction History</CardTitle>
          <CardDescription>Your recent wallet transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Wallet className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No transactions yet</p>
              <p className="text-sm">Make your first deposit to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => {
                const statusInfo = statusConfig[tx.status];
                const StatusIcon = statusInfo.icon;
                const isIncome = tx.transaction_type === 'deposit' || tx.transaction_type === 'wert_purchase' || tx.transaction_type === 'refund' || tx.transaction_type === 'provider_earning';
                
                return (
                  <div 
                    key={tx.id}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isIncome ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                      }`}>
                        {isIncome ? <ArrowDownLeft className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
                      </div>
                      <div>
                        <p className="font-medium capitalize">
                          {tx.transaction_type.replace('_', ' ')}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {tx.network && (
                            <Badge variant="secondary" className="text-xs">
                              {networkConfig[tx.network]?.name || tx.network}
                            </Badge>
                          )}
                          {tx.currency && (
                            <span>{tx.amount_crypto} {tx.currency}</span>
                          )}
                          <span>•</span>
                          <span>{new Date(tx.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-medium ${isIncome ? 'text-green-500' : 'text-red-500'}`}>
                        {isIncome ? '+' : '-'}${tx.amount_usd.toFixed(2)}
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
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WalletTab;
