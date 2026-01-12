/**
 * GST Calculator for Indian Restaurant Orders
 * Compliant with Indian GST regulations
 *
 * GST Rates:
 * - Restaurant Food: 5% (CGST 2.5% + SGST 2.5%)
 * - Delivery Charges: 18% (CGST 9% + SGST 9%)
 * - Platform Fee: 18% (CGST 9% + SGST 9%)
 */

export interface GSTConfig {
  foodGSTRate: number;
  deliveryGSTRate: number;
  platformGSTRate: number;
  isGSTInclusive: boolean;
}

export interface GSTBreakdown {
  subtotalBeforeGST: number;
  deliveryFeeBeforeGST: number;

  foodGSTAmount: number;
  deliveryGSTAmount: number;
  totalGSTAmount: number;

  cgstAmount: number;
  sgstAmount: number;

  subtotalAfterGST: number;
  deliveryFeeAfterGST: number;
  grandTotal: number;

  discountAmount: number;
  walletDeduction: number;
  amountToPay: number;
}

const DEFAULT_GST_CONFIG: GSTConfig = {
  foodGSTRate: 5.0,
  deliveryGSTRate: 18.0,
  platformGSTRate: 18.0,
  isGSTInclusive: true,
};

export function calculateGST(
  cartTotal: number,
  deliveryFee: number,
  discountAmount: number = 0,
  walletBalance: number = 0,
  useWallet: boolean = false,
  config: GSTConfig = DEFAULT_GST_CONFIG
): GSTBreakdown {

  let subtotalBeforeGST: number;
  let deliveryFeeBeforeGST: number;
  let foodGSTAmount: number;
  let deliveryGSTAmount: number;

  if (config.isGSTInclusive) {
    subtotalBeforeGST = cartTotal / (1 + config.foodGSTRate / 100);
    foodGSTAmount = cartTotal - subtotalBeforeGST;

    deliveryFeeBeforeGST = deliveryFee / (1 + config.deliveryGSTRate / 100);
    deliveryGSTAmount = deliveryFee - deliveryFeeBeforeGST;

  } else {
    subtotalBeforeGST = cartTotal;
    foodGSTAmount = cartTotal * (config.foodGSTRate / 100);

    deliveryFeeBeforeGST = deliveryFee;
    deliveryGSTAmount = deliveryFee * (config.deliveryGSTRate / 100);
  }

  const totalGSTAmount = foodGSTAmount + deliveryGSTAmount;

  const cgstAmount = totalGSTAmount / 2;
  const sgstAmount = totalGSTAmount / 2;

  const subtotalAfterGST = cartTotal;
  const deliveryFeeAfterGST = deliveryFee;

  const grandTotalAfterDiscount = subtotalAfterGST + deliveryFeeAfterGST - discountAmount;

  const walletDeduction = useWallet
    ? Math.min(walletBalance, grandTotalAfterDiscount)
    : 0;

  const amountToPay = grandTotalAfterDiscount - walletDeduction;

  return {
    subtotalBeforeGST: Math.round(subtotalBeforeGST * 100) / 100,
    deliveryFeeBeforeGST: Math.round(deliveryFeeBeforeGST * 100) / 100,

    foodGSTAmount: Math.round(foodGSTAmount * 100) / 100,
    deliveryGSTAmount: Math.round(deliveryGSTAmount * 100) / 100,
    totalGSTAmount: Math.round(totalGSTAmount * 100) / 100,

    cgstAmount: Math.round(cgstAmount * 100) / 100,
    sgstAmount: Math.round(sgstAmount * 100) / 100,

    subtotalAfterGST: Math.round(subtotalAfterGST * 100) / 100,
    deliveryFeeAfterGST: Math.round(deliveryFeeAfterGST * 100) / 100,
    grandTotal: Math.round(grandTotalAfterDiscount * 100) / 100,

    discountAmount: Math.round(discountAmount * 100) / 100,
    walletDeduction: Math.round(walletDeduction * 100) / 100,
    amountToPay: Math.round(amountToPay * 100) / 100,
  };
}

export function formatGSTNumber(gstin: string): string {
  return gstin.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function isValidGSTNumber(gstin: string): boolean {
  const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return gstRegex.test(gstin.toUpperCase());
}
