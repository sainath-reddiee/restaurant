# Payment Gateway & GST Implementation Guide
## For Indian Restaurant Ordering System

---

## Part 1: Payment Gateway Comparison for India

### Top Payment Gateways for Food Delivery in India

#### 1. **Razorpay** ⭐ RECOMMENDED
**Pricing:**
- 2% per transaction (no setup fee)
- Instant settlements available
- UPI: 0% for first 50k, then 2%

**Pros:**
- ✅ Best documentation and developer experience
- ✅ Excellent UPI support (GPay, PhonePe, Paytm)
- ✅ Quick KYC approval (24-48 hours)
- ✅ Payment Links, QR codes, subscriptions
- ✅ Great dashboard and analytics
- ✅ Used by Zomato, Swiggy in early days
- ✅ Webhook reliability is excellent
- ✅ Strong community support

**Cons:**
- ❌ 2% fee on every transaction
- ❌ Requires business registration

**Best For:** Startups to enterprise, easiest to integrate

---

#### 2. **Cashfree**
**Pricing:**
- 1.9% per transaction
- Slightly cheaper than Razorpay

**Pros:**
- ✅ Lower transaction fees
- ✅ Good UPI support
- ✅ Instant settlements
- ✅ Multi-payment modes

**Cons:**
- ❌ Documentation not as good as Razorpay
- ❌ Smaller community
- ❌ KYC takes longer (3-5 days)

**Best For:** Cost-conscious businesses

---

#### 3. **PayU**
**Pricing:**
- 2.5% per transaction
- Higher than competitors

**Pros:**
- ✅ Established brand
- ✅ Good for high-volume businesses
- ✅ Enterprise support

**Cons:**
- ❌ More expensive
- ❌ Complex integration
- ❌ Slower KYC process

**Best For:** Large enterprises with high volumes

---

#### 4. **Paytm Payment Gateway**
**Pricing:**
- 1.99% per transaction

**Pros:**
- ✅ Direct integration with Paytm wallet
- ✅ Large user base
- ✅ Good brand recognition

**Cons:**
- ❌ Primarily wallet-focused
- ❌ KYC process can be complex
- ❌ Less developer-friendly

**Best For:** Businesses targeting Paytm wallet users

---

#### 5. **PhonePe Payment Gateway**
**Pricing:**
- 1.5% - 2% per transaction

**Pros:**
- ✅ Strong UPI focus
- ✅ Growing market share
- ✅ Good for UPI-heavy businesses

**Cons:**
- ❌ Relatively new in payment gateway space
- ❌ Limited documentation
- ❌ Smaller developer community

**Best For:** UPI-focused businesses

---

### **RECOMMENDATION: Razorpay**

**Why Razorpay for Your Restaurant App:**

1. **Easy Integration:** Best documentation, can be live in 2-3 hours
2. **UPI Excellence:** Supports all major UPI apps seamlessly
3. **Quick Activation:** KYC approved in 24-48 hours
4. **Reliable Webhooks:** Critical for order confirmation
5. **Developer-Friendly:** Extensive SDKs and libraries
6. **Future-Proof:** Easy to add subscriptions, recurring payments later
7. **Industry Standard:** Used by thousands of food delivery apps

**Cost Analysis:**
```
Order Value: ₹300
Razorpay Fee: ₹6 (2%)
Net Received: ₹294

For 100 orders/day:
Monthly Fee: ₹18,000 (on ₹9,00,000 GMV)
```

---

## Part 2: GST Implementation in India

### GST Basics for Restaurant Delivery

#### GST Rates for Food Delivery:
- **Restaurant Food (in-house):** 5% GST (no ITC - Input Tax Credit)
- **Food Delivery (online):** 5% GST on food value
- **Delivery Charges:** 18% GST
- **Platform/Tech Fee:** 18% GST

#### Restaurant Type Classification:

1. **Non-AC Restaurant (Turnover < ₹20 Lakhs):** NO GST
2. **Non-AC Restaurant (Turnover > ₹20 Lakhs):** 5% GST
3. **AC Restaurant:** 5% GST (mandatory regardless of turnover)

#### GST Components:
```
CGST: Central GST (2.5% for food)
SGST: State GST (2.5% for food)
Total: 5% GST on food items

CGST: 9% for delivery charges
SGST: 9% for delivery charges
Total: 18% GST on delivery
```

---

### Legal Requirements:

#### For Your Platform (Anantapur OS):
- ✅ Must collect GST on platform/tech fees
- ✅ Must issue GST invoice to restaurants
- ✅ Must file monthly GST returns (GSTR-1, GSTR-3B)
- ✅ Need GSTIN (GST Registration Number)

#### For Restaurants:
- ✅ Must have GSTIN if turnover > ₹20 lakhs
- ✅ Must charge GST to customers
- ✅ Must file GST returns
- ✅ Must issue GST-compliant invoices

---

### Invoice Requirements:

**Must Include:**
1. Restaurant GSTIN
2. Customer details (optional for B2C < ₹50k)
3. Invoice number (sequential)
4. Date of invoice
5. Item-wise breakdown
6. GST rate (5% or 18%)
7. CGST + SGST amounts
8. Total amount including GST

---

## Part 3: Implementation in Your Code

### Database Schema Changes

Add these columns to track GST:

```sql
-- Add to restaurants table
ALTER TABLE restaurants
ADD COLUMN IF NOT EXISTS gst_number VARCHAR(15),
ADD COLUMN IF NOT EXISTS is_gst_registered BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS food_gst_rate DECIMAL(5,2) DEFAULT 5.00;

-- Add to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS food_gst_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS delivery_gst_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_gst_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS cgst_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS sgst_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS subtotal_before_gst DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(50);

-- Create invoice number generator
CREATE SEQUENCE IF NOT EXISTS invoice_sequence START 1000;

CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  next_val INTEGER;
  current_fy VARCHAR(10);
BEGIN
  -- Get financial year (Apr-Mar)
  IF EXTRACT(MONTH FROM CURRENT_DATE) >= 4 THEN
    current_fy := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT || '-' ||
                  (EXTRACT(YEAR FROM CURRENT_DATE) + 1)::TEXT;
  ELSE
    current_fy := (EXTRACT(YEAR FROM CURRENT_DATE) - 1)::TEXT || '-' ||
                  EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
  END IF;

  next_val := nextval('invoice_sequence');

  RETURN 'INV/' || current_fy || '/' || LPAD(next_val::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;
```

---

### Update Calculation Logic

Create new file: `/lib/gst-calculator.ts`

```typescript
/**
 * GST Calculator for Indian Restaurant Orders
 * Compliant with Indian GST regulations
 */

export interface GSTConfig {
  foodGSTRate: number;        // 5% for restaurants
  deliveryGSTRate: number;    // 18% for delivery service
  platformGSTRate: number;    // 18% for tech/platform fee
  isGSTInclusive: boolean;    // true if prices already include GST
}

export interface GSTBreakdown {
  // Base amounts (before GST)
  subtotalBeforeGST: number;
  deliveryFeeBeforeGST: number;

  // GST amounts
  foodGSTAmount: number;
  deliveryGSTAmount: number;
  totalGSTAmount: number;

  // Split GST (CGST + SGST)
  cgstAmount: number;
  sgstAmount: number;

  // Final amounts (after GST)
  subtotalAfterGST: number;
  deliveryFeeAfterGST: number;
  grandTotal: number;

  // Discount & Wallet
  discountAmount: number;
  walletDeduction: number;
  amountToPay: number;
}

const DEFAULT_GST_CONFIG: GSTConfig = {
  foodGSTRate: 5.0,           // 5% on restaurant food
  deliveryGSTRate: 18.0,       // 18% on delivery charges
  platformGSTRate: 18.0,       // 18% on platform fee
  isGSTInclusive: true,        // Prices shown include GST
};

/**
 * Calculate GST breakdown for an order
 */
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
    // Prices already include GST - need to extract GST amount
    // Formula: Base = Total / (1 + GST_Rate/100)

    subtotalBeforeGST = cartTotal / (1 + config.foodGSTRate / 100);
    foodGSTAmount = cartTotal - subtotalBeforeGST;

    deliveryFeeBeforeGST = deliveryFee / (1 + config.deliveryGSTRate / 100);
    deliveryGSTAmount = deliveryFee - deliveryFeeBeforeGST;

  } else {
    // Prices don't include GST - need to add GST
    // Formula: GST = Base × (GST_Rate/100)

    subtotalBeforeGST = cartTotal;
    foodGSTAmount = cartTotal * (config.foodGSTRate / 100);

    deliveryFeeBeforeGST = deliveryFee;
    deliveryGSTAmount = deliveryFee * (config.deliveryGSTRate / 100);
  }

  // Total GST
  const totalGSTAmount = foodGSTAmount + deliveryGSTAmount;

  // Split into CGST and SGST (equal split)
  const cgstAmount = totalGSTAmount / 2;
  const sgstAmount = totalGSTAmount / 2;

  // Final amounts
  const subtotalAfterGST = cartTotal;
  const deliveryFeeAfterGST = deliveryFee;

  // Apply discount (discount is on total including GST)
  const grandTotalAfterDiscount = subtotalAfterGST + deliveryFeeAfterGST - discountAmount;

  // Calculate wallet deduction
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

/**
 * Format GST number with validation
 */
export function formatGSTNumber(gstin: string): string {
  // GST format: 22AAAAA0000A1Z5
  // 2 digit state code + 10 digit PAN + 1 digit entity number + 1 digit Z + 1 checksum
  return gstin.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Validate GST number format
 */
export function isValidGSTNumber(gstin: string): boolean {
  const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return gstRegex.test(gstin.toUpperCase());
}

/**
 * Generate GST-compliant invoice data
 */
export function generateGSTInvoice(
  invoiceNumber: string,
  orderData: {
    shortId: string;
    items: Array<{ name: string; quantity: number; price: number }>;
    restaurant: {
      name: string;
      gstNumber?: string;
      address?: string;
    };
    customer: {
      name: string;
      phone: string;
      address: string;
    };
    gstBreakdown: GSTBreakdown;
    orderDate: Date;
  }
) {
  return {
    invoiceNumber,
    invoiceDate: orderData.orderDate.toLocaleDateString('en-IN'),

    // Seller details
    sellerName: orderData.restaurant.name,
    sellerGSTIN: orderData.restaurant.gstNumber || 'NOT REGISTERED',
    sellerAddress: orderData.restaurant.address || '',

    // Buyer details
    buyerName: orderData.customer.name,
    buyerPhone: orderData.customer.phone,
    buyerAddress: orderData.customer.address,

    // Items
    items: orderData.items.map(item => ({
      description: item.name,
      quantity: item.quantity,
      rate: item.price,
      amount: item.quantity * item.price,
      gstRate: 5,
    })),

    // Amounts
    subtotalBeforeGST: orderData.gstBreakdown.subtotalBeforeGST,
    cgst: orderData.gstBreakdown.cgstAmount,
    sgst: orderData.gstBreakdown.sgstAmount,
    totalGST: orderData.gstBreakdown.totalGSTAmount,
    grandTotal: orderData.gstBreakdown.grandTotal,

    // Additional info
    orderReference: orderData.shortId,
    paymentStatus: 'PAID',
  };
}
```

---

### Update Checkout Page with GST

Modify `/app/r/[slug]/checkout/page.tsx`:

```typescript
// Add import
import { calculateGST, type GSTBreakdown } from '@/lib/gst-calculator';

// Replace calculateTotal function:
const calculateTotal = (): GSTBreakdown => {
  const discount = appliedCoupon?.discount_value || 0;

  let deliveryFee = 0;
  if (restaurant?.free_delivery_threshold) {
    deliveryFee = cartTotal >= restaurant.free_delivery_threshold ? 0 : restaurant.delivery_fee;
  } else {
    deliveryFee = restaurant?.delivery_fee || 0;
  }

  // Calculate GST breakdown
  const gstBreakdown = calculateGST(
    cartTotal,
    deliveryFee,
    discount,
    walletBalance,
    useWallet
  );

  return gstBreakdown;
};

// Update the Order Summary card to show GST:
<Card className="mb-6">
  <CardHeader>
    <CardTitle>Order Summary</CardTitle>
  </CardHeader>
  <CardContent className="space-y-2">
    {cartItems.map(item => (
      <div key={item.id} className="flex justify-between text-sm">
        <span>
          {item.quantity}x {item.name}
        </span>
        <span>{formatPrice(item.selling_price * item.quantity)}</span>
      </div>
    ))}

    <Separator className="my-3" />

    {/* Subtotal before GST */}
    <div className="flex justify-between text-sm text-gray-600">
      <span>Subtotal (before GST)</span>
      <span>{formatPrice(totals.subtotalBeforeGST)}</span>
    </div>

    {/* GST on food */}
    <div className="flex justify-between text-sm text-gray-600">
      <span>GST on Food (5%)</span>
      <span>{formatPrice(totals.foodGSTAmount)}</span>
    </div>

    {/* Subtotal after GST */}
    <div className="flex justify-between">
      <span>Food Total</span>
      <span>{formatPrice(totals.subtotalAfterGST)}</span>
    </div>

    {/* Delivery Fee */}
    {totals.deliveryFeeAfterGST > 0 && (
      <>
        <div className="flex justify-between text-sm text-gray-600">
          <span>Delivery Fee (before GST)</span>
          <span>{formatPrice(totals.deliveryFeeBeforeGST)}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>GST on Delivery (18%)</span>
          <span>{formatPrice(totals.deliveryGSTAmount)}</span>
        </div>
        <div className="flex justify-between">
          <span>Delivery Fee</span>
          <span>{formatPrice(totals.deliveryFeeAfterGST)}</span>
        </div>
      </>
    )}

    {/* Discount */}
    {appliedCoupon && (
      <div className="flex justify-between text-green-600">
        <span>Discount ({appliedCoupon.code})</span>
        <span>-{formatPrice(totals.discountAmount)}</span>
      </div>
    )}

    <Separator className="my-3" />

    {/* Total GST */}
    <div className="flex justify-between text-sm font-medium text-gray-700 bg-gray-50 -mx-6 px-6 py-2">
      <span>Total GST</span>
      <span>{formatPrice(totals.totalGSTAmount)}</span>
    </div>

    {/* CGST + SGST breakdown */}
    <div className="flex justify-between text-xs text-gray-500 -mx-6 px-6">
      <span>CGST: {formatPrice(totals.cgstAmount)}</span>
      <span>SGST: {formatPrice(totals.sgstAmount)}</span>
    </div>

    <Separator className="my-3" />

    {/* Grand Total */}
    <div className="flex justify-between font-bold text-lg">
      <span>Grand Total</span>
      <span>{formatPrice(totals.grandTotal)}</span>
    </div>

    {/* Wallet deduction */}
    {useWallet && totals.walletDeduction > 0 && (
      <>
        <div className="flex justify-between text-green-600">
          <span>Wallet Used</span>
          <span>-{formatPrice(totals.walletDeduction)}</span>
        </div>
        <Separator />
        <div className="flex justify-between font-bold text-lg text-orange-600">
          <span>Amount to Pay</span>
          <span>{formatPrice(totals.amountToPay)}</span>
        </div>
      </>
    )}

    {/* GST info note */}
    <div className="text-xs text-gray-500 bg-blue-50 p-3 rounded-lg mt-3">
      <p className="font-medium text-blue-900 mb-1">GST Breakdown:</p>
      <p>All prices include applicable GST as per government regulations.</p>
      {restaurant?.gst_number && (
        <p className="mt-1">Restaurant GSTIN: {restaurant.gst_number}</p>
      )}
    </div>
  </CardContent>
</Card>
```

---

### Update Order Creation to Include GST

In the `placeOrder` function, update the order insertion:

```typescript
// Calculate GST breakdown
const gstBreakdown = calculateTotal();

// Generate invoice number
const { data: invoiceData } = await supabase.rpc('generate_invoice_number');

const { data: order, error } = await supabase
  .from('orders')
  .insert({
    short_id: shortIdData || `ANT-${Date.now()}`,
    invoice_number: invoiceData,
    restaurant_id: restaurant.id,
    customer_id: customerId,
    status: 'PENDING',
    payment_method: paymentMethod,
    voice_note_url: voiceNoteUrl || null,
    gps_coordinates: gpsCoordinates,
    delivery_address: deliveryAddress,

    // Price breakdown
    subtotal_before_gst: gstBreakdown.subtotalBeforeGST,
    food_gst_amount: gstBreakdown.foodGSTAmount,
    delivery_gst_amount: gstBreakdown.deliveryGSTAmount,
    total_gst_amount: gstBreakdown.totalGSTAmount,
    cgst_amount: gstBreakdown.cgstAmount,
    sgst_amount: gstBreakdown.sgstAmount,

    total_amount: gstBreakdown.grandTotal,
    delivery_fee_charged: gstBreakdown.deliveryFeeAfterGST,
    coupon_code: appliedCoupon?.code || null,
    discount_amount: gstBreakdown.discountAmount,

    net_profit: netProfit,
    items: orderItems,
  })
  .select()
  .single();
```

---

## Part 4: Compliance & Best Practices

### 1. GST Invoice Generation

Create a downloadable PDF invoice for customers:

```typescript
// Use libraries like jsPDF or PDFKit
import jsPDF from 'jspdf';

export function generateGSTInvoicePDF(invoiceData: any) {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(20);
  doc.text('TAX INVOICE', 105, 20, { align: 'center' });

  // Restaurant details
  doc.setFontSize(12);
  doc.text(invoiceData.sellerName, 20, 40);
  doc.setFontSize(10);
  doc.text(`GSTIN: ${invoiceData.sellerGSTIN}`, 20, 46);

  // Invoice details
  doc.text(`Invoice No: ${invoiceData.invoiceNumber}`, 150, 40);
  doc.text(`Date: ${invoiceData.invoiceDate}`, 150, 46);

  // Customer details
  doc.text('Bill To:', 20, 60);
  doc.text(invoiceData.buyerName, 20, 66);
  doc.text(invoiceData.buyerPhone, 20, 72);

  // Items table
  // ... add table with items, GST breakdown

  // Download
  doc.save(`Invoice-${invoiceData.invoiceNumber}.pdf`);
}
```

### 2. Monthly GST Reporting

Track all transactions for GST filing:

```sql
-- Query for monthly GST report
SELECT
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as total_orders,
  SUM(subtotal_before_gst) as taxable_amount,
  SUM(total_gst_amount) as total_gst_collected,
  SUM(cgst_amount) as total_cgst,
  SUM(sgst_amount) as total_sgst,
  SUM(total_amount) as gross_revenue
FROM orders
WHERE created_at >= '2026-01-01'
  AND status != 'CANCELLED'
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC;
```

### 3. Restaurant Dashboard - GST Summary

Show restaurants their GST liability:

```typescript
// In partner dashboard
const fetchGSTSummary = async () => {
  const { data } = await supabase
    .from('orders')
    .select('total_gst_amount, cgst_amount, sgst_amount')
    .eq('restaurant_id', restaurantId)
    .gte('created_at', startOfMonth)
    .lte('created_at', endOfMonth);

  const totalGST = data?.reduce((sum, order) => sum + order.total_gst_amount, 0) || 0;

  return {
    totalGSTCollected: totalGST,
    cgst: data?.reduce((sum, order) => sum + order.cgst_amount, 0) || 0,
    sgst: data?.reduce((sum, order) => sum + order.sgst_amount, 0) || 0,
  };
};
```

---

## Summary & Action Items

### Immediate Actions:

1. **Choose Payment Gateway:**
   - ✅ **Recommended: Razorpay**
   - Sign up at https://dashboard.razorpay.com/signup
   - Complete KYC (24-48 hours)
   - Get API keys

2. **Implement GST:**
   - ✅ Run database migrations (add GST columns)
   - ✅ Add `gst-calculator.ts` utility
   - ✅ Update checkout page with GST breakdown
   - ✅ Update order creation with GST data

3. **Legal Compliance:**
   - Get GSTIN for your platform
   - Collect GSTIN from restaurants
   - Implement invoice generation
   - Set up monthly reporting

### Cost Analysis:

```
Example Order:
Food: ₹200 (includes 5% GST = ₹9.52)
Delivery: ₹40 (includes 18% GST = ₹6.10)
Total: ₹240
Total GST: ₹15.62

Razorpay Fee: ₹4.80 (2% of ₹240)
Net to Platform: ₹235.20
GST Liability: ₹15.62 (to be paid to government)
```

### Compliance Checklist:

- [ ] Platform has valid GSTIN
- [ ] Restaurants upload GSTIN to system
- [ ] Invoices generated with all required fields
- [ ] GST breakdown shown on checkout
- [ ] Monthly GST reports available
- [ ] Payment gateway integrated
- [ ] Webhook for payment confirmation
- [ ] Refund handling for cancelled orders

---

**Questions? Need Help?**

- Razorpay Support: https://razorpay.com/support/
- GST Helpline: 1800-103-4786
- CA Consultation recommended for complex GST queries
