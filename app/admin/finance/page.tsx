'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { supabase } from '@/lib/supabase/client';
import type { WalletTransaction } from '@/lib/supabase/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, CheckCircle, XCircle, Clock, ExternalLink, Wallet, TrendingUp, TrendingDown } from 'lucide-react';
import { formatPrice } from '@/lib/format';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

interface TransactionWithRestaurant extends WalletTransaction {
  restaurant_name?: string;
  restaurant_balance?: number;
}

export default function AdminFinancePage() {
  const router = useRouter();
  const { profile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<TransactionWithRestaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionWithRestaurant | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && (!profile || profile.role !== 'SUPER_ADMIN')) {
      router.push('/login');
    }
  }, [profile, authLoading, router]);

  useEffect(() => {
    if (profile?.role === 'SUPER_ADMIN') {
      fetchTransactions();
    }
  }, [profile]);

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select(`
          *,
          restaurants!inner(name, credit_balance)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedData = data.map((item: any) => ({
        ...item,
        restaurant_name: item.restaurants?.name,
        restaurant_balance: item.restaurants?.credit_balance,
      }));

      setTransactions(formattedData);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load transactions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (transaction: TransactionWithRestaurant, action: 'approve' | 'reject') => {
    setSelectedTransaction(transaction);
    setActionType(action);
    setActionDialogOpen(true);
  };

  const confirmAction = async () => {
    if (!selectedTransaction || !profile) return;

    setSubmitting(true);

    try {
      const newStatus = actionType === 'approve' ? 'APPROVED' : 'REJECTED';

      const { error: updateError } = await supabase
        .from('wallet_transactions')
        .update({
          status: newStatus,
          approved_by: profile.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', selectedTransaction.id);

      if (updateError) throw updateError;

      if (actionType === 'approve') {
        const { error: balanceError } = await supabase
          .from('restaurants')
          .update({
            credit_balance: (selectedTransaction.restaurant_balance || 0) + selectedTransaction.amount,
          })
          .eq('id', selectedTransaction.restaurant_id);

        if (balanceError) throw balanceError;
      }

      toast({
        title: `Request ${actionType === 'approve' ? 'Approved' : 'Rejected'}`,
        description: `Recharge request has been ${actionType === 'approve' ? 'approved' : 'rejected'} successfully`,
      });

      setActionDialogOpen(false);
      setSelectedTransaction(null);
      fetchTransactions();
    } catch (error) {
      console.error('Error processing action:', error);
      toast({
        title: 'Error',
        description: 'Failed to process request',
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

  const pendingTransactions = transactions.filter(t => t.status === 'PENDING');
  const approvedTransactions = transactions.filter(t => t.status === 'APPROVED');
  const rejectedTransactions = transactions.filter(t => t.status === 'REJECTED');

  const totalRecharges = approvedTransactions
    .filter(t => t.type === 'WALLET_RECHARGE')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalDeductions = approvedTransactions
    .filter(t => t.type === 'FEE_DEDUCTION')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <Link href="/admin" className="text-sm text-gray-600 hover:text-gray-900">
            ← Back to Admin Dashboard
          </Link>
          <h1 className="text-2xl font-bold mt-2">Finance Management</h1>
          <p className="text-gray-600">Manage wallet recharges and transactions</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingTransactions.length}</div>
              <p className="text-xs text-gray-600 mt-1">
                Awaiting approval
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Recharges</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPrice(totalRecharges)}</div>
              <p className="text-xs text-gray-600 mt-1">
                Approved recharges
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tech Fees Collected</CardTitle>
              <TrendingDown className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPrice(totalDeductions)}</div>
              <p className="text-xs text-gray-600 mt-1">
                From confirmed orders
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Transaction Management</CardTitle>
            <CardDescription>Review and approve recharge requests</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="pending">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="pending">
                  Pending ({pendingTransactions.length})
                </TabsTrigger>
                <TabsTrigger value="approved">
                  Approved ({approvedTransactions.length})
                </TabsTrigger>
                <TabsTrigger value="rejected">
                  Rejected ({rejectedTransactions.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pending" className="space-y-4 mt-4">
                {pendingTransactions.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No pending requests</p>
                ) : (
                  pendingTransactions.map((transaction) => (
                    <TransactionCard
                      key={transaction.id}
                      transaction={transaction}
                      onApprove={() => handleAction(transaction, 'approve')}
                      onReject={() => handleAction(transaction, 'reject')}
                      showActions
                    />
                  ))
                )}
              </TabsContent>

              <TabsContent value="approved" className="space-y-4 mt-4">
                {approvedTransactions.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No approved transactions</p>
                ) : (
                  approvedTransactions.map((transaction) => (
                    <TransactionCard key={transaction.id} transaction={transaction} />
                  ))
                )}
              </TabsContent>

              <TabsContent value="rejected" className="space-y-4 mt-4">
                {rejectedTransactions.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No rejected transactions</p>
                ) : (
                  rejectedTransactions.map((transaction) => (
                    <TransactionCard key={transaction.id} transaction={transaction} />
                  ))
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'Approve' : 'Reject'} Recharge Request
            </DialogTitle>
            <DialogDescription>
              {actionType === 'approve'
                ? 'This will add the amount to the restaurant wallet and mark the request as approved.'
                : 'This will reject the recharge request. The restaurant will not receive the credits.'}
            </DialogDescription>
          </DialogHeader>

          {selectedTransaction && (
            <div className="space-y-2 py-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Restaurant:</span>
                <span className="font-semibold">{selectedTransaction.restaurant_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Amount:</span>
                <span className="font-semibold text-green-600">
                  {formatPrice(selectedTransaction.amount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Current Balance:</span>
                <span className="font-semibold">
                  {formatPrice(selectedTransaction.restaurant_balance || 0)}
                </span>
              </div>
              {actionType === 'approve' && (
                <div className="flex justify-between">
                  <span className="text-gray-600">New Balance:</span>
                  <span className="font-semibold text-green-600">
                    {formatPrice((selectedTransaction.restaurant_balance || 0) + selectedTransaction.amount)}
                  </span>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialogOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              onClick={confirmAction}
              disabled={submitting}
              className={actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                actionType === 'approve' ? 'Approve' : 'Reject'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TransactionCard({
  transaction,
  onApprove,
  onReject,
  showActions = false,
}: {
  transaction: TransactionWithRestaurant;
  onApprove?: () => void;
  onReject?: () => void;
  showActions?: boolean;
}) {
  const isDeduction = transaction.type === 'FEE_DEDUCTION';

  return (
    <div className="p-4 rounded-lg border hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold">{transaction.restaurant_name}</h3>
            <Badge variant={isDeduction ? 'destructive' : 'default'}>
              {isDeduction ? 'Fee Deduction' : 'Recharge Request'}
            </Badge>
          </div>
          <p className="text-sm text-gray-600">
            {new Date(transaction.created_at).toLocaleString()}
          </p>
          {transaction.notes && (
            <p className="text-sm text-gray-700 mt-2">{transaction.notes}</p>
          )}
        </div>
        <div className="text-right">
          <p className={`text-2xl font-bold ${isDeduction ? 'text-red-600' : 'text-green-600'}`}>
            {isDeduction ? '-' : '+'}{formatPrice(Math.abs(transaction.amount))}
          </p>
          <p className="text-xs text-gray-600 mt-1">
            Balance: {formatPrice(transaction.restaurant_balance || 0)}
          </p>
        </div>
      </div>

      {transaction.proof_image_url && (
        <div className="mb-3">
          <a
            href={transaction.proof_image_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-orange-600 hover:text-orange-700 flex items-center gap-1"
          >
            <ExternalLink className="h-3 w-3" />
            View Payment Proof
          </a>
        </div>
      )}

      {showActions ? (
        <div className="flex gap-2">
          <Button
            onClick={onApprove}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Approve
          </Button>
          <Button
            onClick={onReject}
            variant="outline"
            className="flex-1 text-red-600 hover:bg-red-50"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Reject
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          {transaction.status === 'APPROVED' && (
            <Badge className="bg-green-100 text-green-700">
              <CheckCircle className="h-3 w-3 mr-1" />
              Approved
            </Badge>
          )}
          {transaction.status === 'REJECTED' && (
            <Badge className="bg-red-100 text-red-700">
              <XCircle className="h-3 w-3 mr-1" />
              Rejected
            </Badge>
          )}
          {transaction.approved_at && (
            <span className="text-xs text-gray-500">
              on {new Date(transaction.approved_at).toLocaleDateString()}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
