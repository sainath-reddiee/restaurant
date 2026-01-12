# Mock Payment Gateway - Complete Testing Guide

## Overview

A fully functional mock PhonePe payment gateway has been implemented to allow end-to-end testing of all payment features without requiring real PhonePe credentials.

## Features

✅ **Mock Payment Gateway** - Simulates PhonePe payment flow
✅ **Wallet Recharge** - Test wallet top-ups with mock payments
✅ **Order Payments** - Test order checkout with mock payments
✅ **Success/Failure/Pending** - Simulate different payment scenarios
✅ **Database Integration** - All transactions update your database
✅ **Visual Feedback** - Beautiful UI showing payment status

---

## Configuration

### Enable Mock Mode

Mock mode is controlled by the `PHONEPE_MOCK_MODE` environment variable in your `.env` file:

```env
# PhonePe Mock Mode (set to 'true' to use mock payment gateway for testing)
PHONEPE_MOCK_MODE=true
```

- Set to `true` - Uses mock payment gateway (for testing)
- Set to `false` - Uses real PhonePe API (for production)

**Current Status:** Mock mode is **ENABLED** ✅

---

## How It Works

### Flow Diagram

```
User initiates payment
        ↓
/api/phonepe/initiate (checks PHONEPE_MOCK_MODE)
        ↓
    [Mock Mode?]
    /          \
  YES          NO
   ↓            ↓
Mock Payment   Real PhonePe
   Page          API
   ↓
User chooses:
- Success
- Failure
- Pending
   ↓
/api/phonepe/mock/callback
   ↓
Database Updated
   ↓
Redirect to status page
```

---

## Testing Scenarios

### Scenario 1: Wallet Recharge (Success)

**Steps:**
1. Go to `/profile`
2. Click "Add Money" or "Recharge Wallet"
3. Enter amount (e.g., ₹500)
4. Click "Proceed to Pay"
5. On mock payment page, click **"Simulate Success"**
6. Wait for redirect
7. Verify wallet balance increased

**Expected Result:**
- Wallet balance increases by ₹500
- Transaction record created in `wallet_transactions` table
- Success message displayed

---

### Scenario 2: Wallet Recharge (Failure)

**Steps:**
1. Go to `/profile`
2. Click "Add Money"
3. Enter amount (e.g., ₹1000)
4. Click "Proceed to Pay"
5. On mock payment page, click **"Simulate Failure"**
6. Wait for redirect
7. Verify wallet balance unchanged

**Expected Result:**
- Wallet balance remains the same
- Failed transaction may be logged
- Error message displayed

---

### Scenario 3: Order Payment with Wallet

**Steps:**
1. Browse restaurant menu at `/r/[slug]`
2. Add items to cart
3. Go to checkout
4. Select "Pay with Wallet" (if balance sufficient)
5. Complete order

**Expected Result:**
- Order created with status `paid`
- Wallet balance decreases by order amount
- Restaurant receives order notification

---

### Scenario 4: Order Payment with PhonePe (Success)

**Steps:**
1. Browse restaurant menu
2. Add items to cart
3. Go to checkout
4. Select "Pay with PhonePe"
5. On mock payment page, click **"Simulate Success"**
6. Wait for redirect

**Expected Result:**
- Order status changes to `paid`
- Order appears in restaurant dashboard
- Payment transaction ID recorded

---

### Scenario 5: Order Payment with PhonePe (Failure)

**Steps:**
1. Create order and proceed to PhonePe payment
2. On mock payment page, click **"Simulate Failure"**
3. Wait for redirect

**Expected Result:**
- Order status remains `pending` or changes to `failed`
- Payment not processed
- User can retry payment

---

### Scenario 6: Pending Payment

**Steps:**
1. Initiate any payment (wallet or order)
2. On mock payment page, click **"Simulate Pending"**
3. Wait for redirect

**Expected Result:**
- Payment status shows as `pending`
- Order/wallet not updated yet
- User can check status later

---

## Database Verification

After each test, verify the database changes:

### Check Wallet Balance

```sql
SELECT id, phone_number, wallet_balance
FROM profiles
WHERE id = 'your-user-id';
```

### Check Wallet Transactions

```sql
SELECT *
FROM wallet_transactions
WHERE user_id = 'your-user-id'
ORDER BY created_at DESC;
```

### Check Order Status

```sql
SELECT id, status, payment_status, payment_transaction_id, total_amount
FROM orders
WHERE id = 'your-order-id';
```

---

## Mock Payment Page Features

The mock payment page (`/phonepe/mock-payment`) provides:

### Visual Information
- **Transaction ID** - Unique payment identifier
- **Amount** - Payment amount in ₹
- **User Details** - Mobile number, user ID
- **Transaction Type** - Order or wallet recharge

### Action Buttons
- **🟢 Simulate Success** - Payment succeeds, wallet/order updated
- **🔴 Simulate Failure** - Payment fails, no changes made
- **🟡 Simulate Pending** - Payment in pending state

### Visual Feedback
- Loading states during processing
- Success/failure animations
- Automatic redirect after 1.5 seconds

---

## API Endpoints

### Mock Initiate
```
POST /api/phonepe/mock/initiate
```
Creates a mock payment session and returns mock payment URL.

### Mock Callback
```
POST /api/phonepe/mock/callback
```
Processes mock payment result and updates database.

### Payment Initiate (Auto-routes)
```
POST /api/phonepe/initiate
```
Automatically routes to mock or real API based on `PHONEPE_MOCK_MODE`.

---

## Switching to Production

When ready to use real PhonePe:

1. **Get Real Credentials**
   - Register at https://developer.phonepe.com/
   - Obtain production merchant ID and keys

2. **Update .env File**
   ```env
   PHONEPE_MOCK_MODE=false
   PHONEPE_MERCHANT_ID=YOUR_REAL_MERCHANT_ID
   PHONEPE_SALT_KEY=YOUR_REAL_SALT_KEY
   PHONEPE_SALT_INDEX=1
   PHONEPE_HOST_URL=https://api.phonepe.com/apis/hermes
   ```

3. **Restart Server**
   ```bash
   npm run dev
   ```

4. **Test with Small Amounts**
   - Start with ₹1 transactions
   - Verify callbacks work correctly
   - Check database updates

---

## Troubleshooting

### Payment not updating database

**Check:**
1. Mock callback is being called (check browser console)
2. Database permissions (RLS policies)
3. Transaction ID format (order_ or wallet_)

**Solution:** Check server logs for errors

---

### Redirect not working

**Check:**
1. `redirectUrl` parameter is correct
2. Transaction ID is being passed
3. Status page exists

**Solution:** Verify URL format in mock payment page

---

### Balance not updating

**Check:**
1. User ID is correct in transaction
2. Wallet transaction record created
3. Profile RLS policies allow updates

**Solution:** Check `wallet_transactions` table for errors

---

## Testing Checklist

Use this checklist to verify all features:

- [ ] Wallet recharge (success)
- [ ] Wallet recharge (failure)
- [ ] Order payment with wallet
- [ ] Order payment with PhonePe (success)
- [ ] Order payment with PhonePe (failure)
- [ ] Pending payment scenario
- [ ] Database updates correctly
- [ ] Transaction history visible
- [ ] Partner wallet receives restaurant payments
- [ ] Admin can view all transactions

---

## Advanced Testing

### Test Partner Wallet

1. Login as restaurant owner
2. Go to `/partner/wallet`
3. Complete paid orders
4. Verify tech fee deduction
5. Check partner balance increases

### Test Admin Finance

1. Login as admin
2. Go to `/admin/finance`
3. View all transactions
4. Verify platform revenue calculation
5. Check wallet transaction logs

---

## Support

If you encounter any issues:

1. Check browser console for errors
2. Check server logs (terminal)
3. Verify environment variables loaded
4. Test with different amounts
5. Clear browser cache and cookies

---

## Summary

The mock payment gateway provides a complete testing environment without requiring real payment processing. All features work exactly as they would in production, allowing you to:

- Test the complete user journey
- Verify database integrity
- Debug payment flows
- Demo the application
- Train staff/partners

Simply set `PHONEPE_MOCK_MODE=false` when ready for production!
