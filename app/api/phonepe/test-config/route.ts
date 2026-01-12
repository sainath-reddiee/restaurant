import { NextResponse } from 'next/server';

export async function GET() {
  const config = {
    merchantId: process.env.PHONEPE_MERCHANT_ID || 'NOT_SET',
    saltKey: process.env.PHONEPE_SALT_KEY ? 'SET (hidden)' : 'NOT_SET',
    saltIndex: process.env.PHONEPE_SALT_INDEX || 'NOT_SET',
    hostUrl: process.env.PHONEPE_HOST_URL || 'NOT_SET',
    appUrl: process.env.NEXT_PUBLIC_APP_URL || 'NOT_SET',
    nodeEnv: process.env.NODE_ENV,
  };

  const allSet = Object.entries(config)
    .filter(([key]) => key !== 'nodeEnv')
    .every(([_, value]) => value !== 'NOT_SET');

  return NextResponse.json({
    status: allSet ? 'OK' : 'MISSING_CONFIG',
    config,
    timestamp: new Date().toISOString(),
  });
}
