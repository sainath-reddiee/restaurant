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
    else if (merchantTransactionId.startsWith('wallet_')) {
      // Extract user info from transaction ID or body
      const parts = merchantTransactionId.split('_');
      const userId = parts[parts.length - 1];

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
        const newBalance = currentBalance + amount;

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

        // Create wallet transaction record
        const { error: txError } = await supabase
          .from('wallet_transactions')
          .insert({
            user_id: userId,
            amount: amount,
            type: 'credit',
            description: `Wallet recharge - Mock Payment`,
            payment_transaction_id: merchantTransactionId,
            status: 'completed'
          });

        if (txError) {
          console.error('[Mock Callback] Error creating wallet transaction:', txError);
        }

        console.log('[Mock Callback] Wallet credited:', userId, 'Amount:', amount);
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
