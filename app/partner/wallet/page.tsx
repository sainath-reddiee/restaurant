'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { supabase } from '@/lib/supabase/client';
import type { Restaurant, WalletTransaction } from '@/lib/supabase/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, Wallet, AlertCircle, CheckCircle, Clock, XCircle, Plus, ArrowDown, ArrowUp, AlertTriangle } from 'lucide-react';
import { formatPrice } from '@/lib/format';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function PartnerWalletPage() {
  const router = useRouter();
  const { profile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [rechargeDialogOpen, setRechargeDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [proofImage, setProofImage] = useState<File | null>(null);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!authLoading && (!profile || profile.role !== 'RESTAURANT')) {
      router.push('/login');
    }
  }, [profile, authLoading, router]);

  useEffect(() => {
    if (profile?.role === 'RESTAURANT') {
      fetchData();
    }
  }, [profile]);

  const fetchData = async () => {
    try {
      const { data: restaurantData } = await supabase
        .from('restaurants')
        .select('*')
        .eq('owner_phone', profile!.phone)
        .maybeSingle();

      if (restaurantData) {
        setRestaurant(restaurantData);
        fetchTransactions(restaurantData.id);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async (restaurantId: string) => {
    const { data } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false });

    if (data) {
      setTransactions(data);
    }
  };

  const handleRecharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant) return;

    const amount = parseInt(rechargeAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid amount',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      let proofUrl = null;

      if (proofImage) {
        const fileExt = proofImage.name.split('.').pop();
        const fileName = `${restaurant.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('payment-proofs')
          .upload(fileName, proofImage);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('payment-proofs')
          .getPublicUrl(fileName);

        proofUrl = publicUrl;
      }

      const { error } = await supabase
        .from('wallet_transactions')
        .insert({
          restaurant_id: restaurant.id,
          amount,
          type: 'WALLET_RECHARGE',
          status: 'PENDING',
          proof_image_url: proofUrl,
          notes,
        });

      if (error) throw error;

      toast({
        title: 'Recharge Request Submitted',
        description: 'Your recharge request has been submitted for admin approval',
      });

      setRechargeDialogOpen(false);
      setRechargeAmount('');
      setProofImage(null);
      setNotes('');
      fetchData();
    } catch (error) {
      console.error('Error submitting recharge:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit recharge request',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Restaurant not found</p>
      </div>
    );
  }

  const balanceStatus = restaurant.credit_balance >= 0 ? 'positive' :
                       restaurant.credit_balance >= restaurant.min_balance_limit ? 'warning' : 'critical';

  const canAcceptOrders = restaurant.credit_balance >= restaurant.min_balance_limit;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <Link href="/partner" className="text-sm text-gray-600 hover:text-gray-900">
            ← Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold mt-2">Wallet Management</h1>
          <p className="text-gray-600">{restaurant.name}</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {!canAcceptOrders && (
          <div className="mb-6 bg-red-50 border-2 border-red-500 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-red-900">Restaurant Suspended</h3>
              <p className="text-sm text-red-700 mt-1">
                Your wallet balance is below the minimum limit. Please recharge immediately to accept new orders.
              </p>
            </div>
          </div>
        )}

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Current Balance
            </CardTitle>
            <CardDescription>Your prepaid credit balance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold" style={{
                    color: balanceStatus === 'positive' ? '#16a34a' :
                           balanceStatus === 'warning' ? '#f59e0b' : '#dc2626'
                  }}>
                    {formatPrice(restaurant.credit_balance)}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Minimum limit: {formatPrice(restaurant.min_balance_limit)}
                  </p>
                </div>
                <Dialog open={rechargeDialogOpen} onOpenChange={setRechargeDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-orange-600 hover:bg-orange-700">
                      <Plus className="h-4 w-4 mr-2" />
                      Recharge Wallet
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Recharge Wallet</DialogTitle>
                      <DialogDescription>
                        Submit a recharge request with payment proof
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleRecharge} className="space-y-4">
                      <div>
                        <Label htmlFor="amount">Amount (₹)</Label>
                        <Input
                          id="amount"
                          type="number"
                          value={rechargeAmount}
                          onChange={(e) => setRechargeAmount(e.target.value)}
                          placeholder="Enter amount"
                          required
                          min="1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="proof">Payment Proof (Optional)</Label>
                        <Input
                          id="proof"
                          type="file"
                          accept="image/*"
                          onChange={(e) => setProofImage(e.target.files?.[0] || null)}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Upload screenshot of payment to admin
                        </p>
                      </div>
                      <div>
                        <Label htmlFor="notes">Notes (Optional)</Label>
                        <Textarea
                          id="notes"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Add any additional notes..."
                          rows={3}
                        />
                      </div>
                      <Button
                        type="submit"
                        className="w-full bg-orange-600 hover:bg-orange-700"
                        disabled={submitting}
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          'Submit Request'
                        )}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              <Separator />

              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-semibold text-gray-900">
                    ₹{restaurant.tech_fee}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">Tech Fee per Order</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold text-gray-900">
                    {Math.floor(Math.abs(restaurant.min_balance_limit) / restaurant.tech_fee)}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">Orders on Credit</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold" style={{
                    color: canAcceptOrders ? '#16a34a' : '#dc2626'
                  }}>
                    {canAcceptOrders ? 'Active' : 'Suspended'}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">Status</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>All wallet transactions and recharge requests</CardDescription>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No transactions yet</p>
            ) : (
              <div className="space-y-3">
                {transactions.map((transaction) => {
                  const isDeduction = transaction.type === 'FEE_DEDUCTION';
                  const statusConfig = {
                    PENDING: { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Pending' },
                    APPROVED: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', label: 'Approved' },
                    REJECTED: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', label: 'Rejected' },
                  }[transaction.status];

                  const StatusIcon = statusConfig.icon;

                  return (
                    <div key={transaction.id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${isDeduction ? 'bg-red-100' : 'bg-green-100'}`}>
                          {isDeduction ? (
                            <ArrowDown className="h-4 w-4 text-red-600" />
                          ) : (
                            <ArrowUp className="h-4 w-4 text-green-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">
                            {isDeduction ? 'Tech Fee Deduction' : 'Wallet Recharge'}
                          </p>
                          {transaction.notes && (
                            <p className="text-sm text-gray-600">{transaction.notes}</p>
                          )}
                          <p className="text-xs text-gray-500">
                            {new Date(transaction.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className={`${statusConfig.bg} ${statusConfig.color}`}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusConfig.label}
                        </Badge>
                        <p className={`text-lg font-semibold ${isDeduction ? 'text-red-600' : 'text-green-600'}`}>
                          {isDeduction ? '-' : '+'}{formatPrice(Math.abs(transaction.amount))}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
