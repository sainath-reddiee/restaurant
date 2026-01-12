import { NextRequest, NextResponse } from 'next/server';
import { initiatePhonePePayment } from '@/lib/phonepe';

export async function POST(request: NextRequest) {
  try {
    // Validate environment variables first
    const requiredEnvVars = [
      'PHONEPE_MERCHANT_ID',
      'PHONEPE_SALT_KEY',
      'PHONEPE_SALT_INDEX',
      'PHONEPE_HOST_URL'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      console.error('Missing PhonePe environment variables:', missingVars);
      return NextResponse.json(
        { success: false, error: `Missing environment variables: ${missingVars.join(', ')}` },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { amount, transactionId, mobileNumber, userId, type } = body;

    console.log('PhonePe Initiate Request:', { amount, transactionId, type, userId: userId?.substring(0, 8) });

    // Validate required fields
    if (!amount || !transactionId || !mobileNumber || !userId || !type) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate type
    if (type !== 'ORDER' && type !== 'RECHARGE') {
      return NextResponse.json(
        { success: false, error: 'Invalid transaction type' },
        { status: 400 }
      );
    }

    // Validate amount
    if (amount <= 0 || amount > 100000) {
      return NextResponse.json(
        { success: false, error: 'Invalid amount' },
        { status: 400 }
      );
    }

    // Get the base URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Set callback and redirect URLs based on type
    const callbackUrl = `${baseUrl}/api/phonepe/callback`;
    const redirectUrl = type === 'ORDER'
      ? `${baseUrl}/phonepe/payment-status?type=ORDER&txnId=${transactionId}`
      : `${baseUrl}/phonepe/payment-status?type=RECHARGE&txnId=${transactionId}`;

    // Initiate PhonePe payment
    const result = await initiatePhonePePayment(
      transactionId,
      amount,
      mobileNumber,
      userId,
      callbackUrl,
      redirectUrl
    );

    if (result.success && result.redirectUrl) {
      console.log('Payment initiated successfully:', transactionId);
      return NextResponse.json({
        success: true,
        redirectUrl: result.redirectUrl,
        transactionId,
      });
    } else {
      console.error('Payment initiation failed:', result.error);
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to initiate payment',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('PhonePe initiate API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
