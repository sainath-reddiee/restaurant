import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { merchantTransactionId, status, amount } = body;

    console.log('[Mock PhonePe Callback] Received:', {
      merchantTransactionId,
      status,
      amount
    });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Update order status based on payment result
    if (merchantTransactionId.startsWith('order_')) {
      const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('payment_transaction_id', merchantTransactionId)
        .maybeSingle();

      if (fetchError) {
        console.error('[Mock Callback] Error fetching order:', fetchError);
        throw fetchError;
      }

      if (!order) {
        console.error('[Mock Callback] Order not found:', merchantTransactionId);
        return NextResponse.json({
          success: false,
          message: 'Order not found'
        }, { status: 404 });
      }

      const newStatus = status === 'success' ? 'paid' : 'failed';
      const paymentStatus = status === 'success' ? 'completed' : 'failed';

      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: newStatus,
          payment_status: paymentStatus,
          payment_merchant_transaction_id: merchantTransactionId,
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id);

      if (updateError) {
        console.error('[Mock Callback] Error updating order:', updateError);
        throw updateError;
      }

      console.log('[Mock Callback] Order updated:', order.id, 'Status:', newStatus);
    }
    // Handle wallet recharge
    else if (merchantTransactionId.startsWith('RECHARGE-')) {
      // Extract transaction ID from RECHARGE-{txnId}-{timestamp}
      const parts = merchantTransactionId.split('-');
      const walletTxnId = parts[1];

      // Look up the wallet transaction record
      const { data: walletTxn, error: walletTxnError } = await supabase
        .from('wallet_transactions')
        .select('user_id, amount, id')
        .eq('id', walletTxnId)
        .maybeSingle();

      if (walletTxnError || !walletTxn) {
        console.error('[Mock Callback] Error fetching wallet transaction:', walletTxnError);
        throw walletTxnError || new Error('Wallet transaction not found');
      }

      const userId = walletTxn.user_id;
      const rechargeAmount = walletTxn.amount;

      if (status === 'success') {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('wallet_balance')
          .eq('id', userId)
          .maybeSingle();

        if (profileError) {
          console.error('[Mock Callback] Error fetching profile:', profileError);
          throw profileError;
        }

        const currentBalance = profile?.wallet_balance || 0;
        const newBalance = currentBalance + rechargeAmount;

        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            wallet_balance: newBalance,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);

        if (updateError) {
          console.error('[Mock Callback] Error updating wallet:', updateError);
          throw updateError;
        }

        // Update wallet transaction status
        const { error: txUpdateError } = await supabase
          .from('wallet_transactions')
          .update({
            status: 'COMPLETED',
            payment_transaction_id: merchantTransactionId,
            updated_at: new Date().toISOString()
          })
          .eq('id', walletTxnId);

        if (txUpdateError) {
          console.error('[Mock Callback] Error updating wallet transaction:', txUpdateError);
        }

        console.log('[Mock Callback] Wallet credited:', userId, 'Amount:', rechargeAmount);
      } else {
        // Mark transaction as failed
        const { error: txUpdateError } = await supabase
          .from('wallet_transactions')
          .update({
            status: 'FAILED',
            payment_transaction_id: merchantTransactionId,
            updated_at: new Date().toISOString()
          })
          .eq('id', walletTxnId);

        if (txUpdateError) {
          console.error('[Mock Callback] Error updating wallet transaction:', txUpdateError);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Payment processed successfully'
    });
  } catch (error) {
    console.error('[Mock PhonePe Callback] Error:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
