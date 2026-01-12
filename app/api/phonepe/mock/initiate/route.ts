import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { amount, merchantTransactionId, redirectUrl, callbackUrl, user } = body;

    console.log('[Mock PhonePe] Initiating payment:', {
      amount,
      merchantTransactionId,
      redirectUrl,
      callbackUrl,
      user
    });

    // Create a mock payment session
    const mockPaymentUrl = `/phonepe/mock-payment?` + new URLSearchParams({
      merchantTransactionId,
      amount: amount.toString(),
      redirectUrl: redirectUrl || '',
      callbackUrl: callbackUrl || '',
      merchantUserId: user?.phoneNumber || 'guest',
      mobileNumber: user?.phoneNumber || ''
    }).toString();

    return NextResponse.json({
      success: true,
      code: 'PAYMENT_INITIATED',
      message: 'Mock payment initiated',
      data: {
        instrumentResponse: {
          type: 'PAY_PAGE',
          redirectInfo: {
            url: mockPaymentUrl,
            method: 'GET'
          }
        }
      }
    });
  } catch (error) {
    console.error('[Mock PhonePe] Error:', error);
    return NextResponse.json({
      success: false,
      code: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
      data: {}
    }, { status: 500 });
  }
}
