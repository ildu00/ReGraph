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
  AlertTriangle
} from "lucide-react";

type BlockchainNetwork = 'ethereum' | 'polygon' | 'bsc' | 'arbitrum' | 'optimism' | 'solana' | 'bitcoin' | 'tron';
type CryptoCurrency = 'ETH' | 'BTC' | 'SOL' | 'USDT' | 'USDC' | 'MATIC' | 'BNB' | 'TRX';
type TransactionType = 'deposit' | 'withdrawal' | 'usage_charge' | 'refund' | 'wert_purchase';
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

  useEffect(() => {
    if (user) {
      fetchWalletData();
    }
  }, [user]);

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
            <Button variant="ghost" size="sm" onClick={fetchWalletData}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
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
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Deposit Crypto
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Deposit Cryptocurrency</DialogTitle>
                    <DialogDescription>
                      Send crypto to your unique deposit address. Your balance will be credited after confirmations.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 mt-4">
                    {(Object.keys(networkConfig) as BlockchainNetwork[]).map((network) => {
                      const config = networkConfig[network];
                      const existingAddress = getAddressForNetwork(network);
                      
                      return (
                        <Card key={network} className="border-border">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full ${config.color} flex items-center justify-center text-white text-lg font-bold`}>
                                  {config.icon}
                                </div>
                                <div>
                                  <p className="font-medium">{config.name}</p>
                                  <div className="flex gap-1 mt-0.5">
                                    {config.tokens.map(token => (
                                      <Badge key={token} variant="secondary" className="text-xs">
                                        {token}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              </div>
                              
                              {existingAddress ? (
                                <div className="flex items-center gap-2">
                                  <code className="text-xs bg-muted px-2 py-1 rounded max-w-[200px] truncate">
                                    {existingAddress.address}
                                  </code>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => copyToClipboard(existingAddress.address)}
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                </div>
                              ) : (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => generateDepositAddress(network)}
                                  disabled={generatingAddress === network}
                                >
                                  {generatingAddress === network ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    'Generate Address'
                                  )}
                                </Button>
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
                  <Button variant="outline" className="gap-2">
                    <CreditCard className="h-4 w-4" />
                    Buy with Card
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
                  <Button variant="outline" className="gap-2">
                    <Send className="h-4 w-4" />
                    Withdraw
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

      {/* Deposit Addresses Quick View */}
      {depositAddresses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Deposit Addresses</CardTitle>
            <CardDescription>Send crypto to these addresses to top up your balance</CardDescription>
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
                        <p className="font-medium text-sm">{config.name}</p>
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
                const isIncome = tx.transaction_type === 'deposit' || tx.transaction_type === 'wert_purchase' || tx.transaction_type === 'refund';
                
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
