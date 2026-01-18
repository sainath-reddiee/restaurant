# Quick Start - Mock Payment Testing

## 🚀 Ready to Test!

Your mock payment system is **fully configured and ready**. You can now test all payment features without needing real PhonePe credentials.

---

## ✅ What's Been Implemented

1. **Mock Payment Gateway** - Simulates PhonePe payment flow
2. **Mock Payment Page** - Beautiful UI to simulate success/failure
3. **Database Integration** - All transactions update your database correctly
4. **Wallet Recharge** - Test wallet top-ups with mock payments
5. **Order Payments** - Test order checkout with mock payments
6. **Environment Toggle** - Easy switch between mock and real PhonePe

---

## 🎯 Quick Test (5 Minutes)

### Test 1: Wallet Recharge

1. Open your app in the browser
2. Login or continue as guest
3. Go to **Profile** page (`/profile`)
4. Click **"Add Money"** or **"Recharge Wallet"**
5. Enter amount: `₹500`
6. Click **"Proceed to Pay"**
7. You'll see the **Mock Payment Page**
8. Click **"Simulate Success"** 🟢
9. Wait 2 seconds - you'll be redirected
10. **Verify:** Wallet balance increased by ₹500 ✅

### Test 2: Order Payment

1. Browse a restaurant menu (`/r/[restaurant-slug]`)
2. Add items to cart
3. Click **"Checkout"**
4. Select **"Pay with PhonePe"**
5. On mock payment page, click **"Simulate Success"** 🟢
6. **Verify:** Order status changes to "Paid" ✅

### Test 3: Payment Failure

1. Start any payment (wallet or order)
2. On mock payment page, click **"Simulate Failure"** 🔴
3. **Verify:** Payment fails, no money deducted ✅

---

## 🔧 Configuration

Mock mode is **ENABLED** by default in your `.env` file:

```env
PHONEPE_MOCK_MODE=true
```

### To Switch to Real PhonePe:
```env
PHONEPE_MOCK_MODE=false
```

Then restart your dev server:
```bash
npm run dev
```

---

## 📋 File Structure

New files created:

```
/app
  /api
    /phonepe
      /mock
        /initiate
          route.ts          ← Mock payment initiation
        /callback
          route.ts          ← Mock payment callback
  /phonepe
    /mock-payment
      page.tsx              ← Mock payment UI

/.env                       ← PHONEPE_MOCK_MODE=true

/MOCK_PAYMENT_TESTING_GUIDE.md  ← Complete guide
/QUICK_START_MOCK_PAYMENTS.md   ← This file
```

---

## 💡 How It Works

```
User clicks "Pay"
       ↓
/api/phonepe/initiate
       ↓
Checks PHONEPE_MOCK_MODE
       ↓
   [If TRUE]
       ↓
Redirects to /phonepe/mock-payment
       ↓
User chooses: Success / Failure / Pending
       ↓
/api/phonepe/mock/callback
       ↓
Database Updated (wallet/orders)
       ↓
Redirect back to app
```

---

## 🎨 Mock Payment Page Features

The mock payment page shows:

- **Transaction ID** - Unique identifier
- **Amount** - Payment amount in ₹
- **User Info** - Mobile number, user ID
- **Three Buttons:**
  - 🟢 **Simulate Success** - Payment succeeds
  - 🔴 **Simulate Failure** - Payment fails
  - 🟡 **Simulate Pending** - Payment pending

---

## 📊 Database Tables Updated

### Wallet Recharge
- `profiles.wallet_balance` - Updated with new balance
- `wallet_transactions` - New transaction record created

### Order Payment
- `orders.status` - Changed to `paid` or `failed`
- `orders.payment_status` - Updated
- `orders.payment_transaction_id` - Recorded

---

## 🧪 Test Scenarios

| Scenario | Action | Expected Result |
|----------|--------|----------------|
| Wallet Success | Click "Simulate Success" | Balance increases |
| Wallet Failure | Click "Simulate Failure" | Balance unchanged |
| Order Success | Click "Simulate Success" | Order marked paid |
| Order Failure | Click "Simulate Failure" | Order remains pending |
| Pending Payment | Click "Simulate Pending" | Status shows pending |

---

## 🐛 Troubleshooting

### Payment page not showing?
- Check console logs for errors
- Verify `PHONEPE_MOCK_MODE=true` in `.env`
- Restart dev server

### Database not updating?
- Check server logs
- Verify Supabase credentials in `.env`
- Check RLS policies in Supabase dashboard

### Redirect not working?
- Check browser console for errors
- Verify transaction ID format
- Check redirect URL in logs

---

## 📖 Full Documentation

For complete testing guide, see: **`MOCK_PAYMENT_TESTING_GUIDE.md`**

Includes:
- Detailed test scenarios
- Database verification queries
- Admin/partner testing
- Production deployment guide

---

## ✨ Benefits

✅ **No PhonePe Registration** - Start testing immediately
✅ **Complete Flow** - Tests entire payment journey
✅ **Database Updates** - Real database transactions
✅ **Visual Feedback** - Beautiful mock payment UI
✅ **Easy Toggle** - Switch to production when ready
✅ **Safe Testing** - No real money involved

---

## 🚀 Next Steps

1. **Test Now:** Follow "Quick Test" above
2. **Verify Database:** Check wallet/order tables
3. **Test All Features:** Wallet, orders, partner wallet
4. **When Ready:** Switch to real PhonePe (set `PHONEPE_MOCK_MODE=false`)

---

## 💬 Need Help?

1. Check console logs (browser + server)
2. Read `MOCK_PAYMENT_TESTING_GUIDE.md`
3. Verify environment variables
4. Check database RLS policies

---

**Happy Testing! 🎉**

The mock payment system is fully functional and ready to use. Start testing your restaurant ordering app now!
