# Vello - Food Delivery Platform for Anantapur

A comprehensive food delivery platform built with Next.js 14, Tailwind CSS, and Supabase, featuring role-based access control, wallet functionality, and advanced order management.

## Features

### Core Functionality
- **Role-Based Access Control**: Distinct UIs and permissions for Super Admins, Restaurant Owners, and Customers
- **Wallet System**: Customer wallet for refunds and rewards (no direct top-ups)
- **Restaurant Management**: Complete restaurant onboarding, menu management, and order tracking
- **Voice Ordering**: Voice note support for customer delivery instructions
- **GPS Integration**: Automatic location capture for accurate deliveries
- **Loot Mode**: Flash sales on excess inventory with real-time stock management
- **Mystery Boxes**: Surprise meals at discounted prices
- **Coupon System**: Restaurant-specific discount codes with minimum order validation
- **Multiple Payment Methods**:
  - UPI Prepaid (instant payment)
  - Cash on Delivery
  - UPI on Delivery (scan QR at door)

### Security & Access Control
- **Next.js Middleware**: Route protection based on user roles
- **Row Level Security**: Database-level security policies for all tables
- **Role-Based Redirects**: Automatic redirect to appropriate dashboard after login
  - SUPER_ADMIN → `/admin`
  - RESTAURANT → `/dashboard`
  - CUSTOMER → `/` (home)

## Tech Stack

- **Frontend**: Next.js 14 with App Router, TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui component library
- **Backend**: Supabase (Auth, Database, Realtime)
- **Database**: PostgreSQL with Row Level Security (RLS)
- **State Management**: React Context (Auth, Cart)
- **Payment Integration**: UPI deep links for seamless payments

## Database Schema

### Tables
1. **profiles** - User profiles with role-based access
   - Roles: SUPER_ADMIN, RESTAURANT, CUSTOMER
   - Fields: id, role, phone, full_name, wallet_balance

2. **restaurants** - Restaurant information
   - Fields: id, name, owner_phone, upi_id, image_url, tech_fee, delivery_fee, slug

3. **menu_items** - Restaurant menu with pricing and stock
   - Fields: id, restaurant_id, name, category, base_price, selling_price, stock_remaining

4. **orders** - Complete order records
   - Fields: id, short_id, restaurant_id, customer_id, status, payment_method, items, total_amount

5. **coupons** - Restaurant-scoped discount codes
   - Fields: id, restaurant_id, code, discount_value, min_order_value

## Wallet System

### How It Works
- Customers cannot add money directly to their wallet
- Wallet balance is credited through:
  - Order refunds
  - Platform rewards and promotions
- At checkout, customers can opt to use their wallet balance
- Wallet deduction is applied before payment calculation
- If wallet covers full amount, no payment required

### Checkout Flow with Wallet
1. Customer reviews order and sees grand total
2. If wallet balance > 0, option to use wallet appears
3. Customer checks "Use Wallet Balance"
4. Amount deducted: `min(wallet_balance, grand_total)`
5. Final payment: `grand_total - wallet_deduction`
6. On order completion, wallet balance is updated in database

## Getting Started

### Prerequisites
- Node.js 18+ installed
- Supabase account and project
- Environment variables configured

### Installation

1. Clone the repository and install dependencies:
```bash
npm install
```

2. Set up environment variables in `.env`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. Run the development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
npm start
```

## User Roles & Permissions

### SUPER_ADMIN
- Platform-wide control
- Onboard and manage all restaurants
- View all orders and analytics
- Access to admin dashboard (`/admin`)
- Can manage all menu items across restaurants

### RESTAURANT
- Manage own restaurant details
- Create and update menu items
- View and update order status
- Access to restaurant dashboard (`/dashboard`)
- Create and manage coupons
- View profit analytics

### CUSTOMER
- Browse restaurants and menus
- Place orders with voice notes and GPS
- Track order history
- View and use wallet balance
- Access to profile page (`/profile`)
- Apply coupons at checkout

## Route Protection

The application uses Next.js middleware for route protection:
- `/admin/*` - Only SUPER_ADMIN role
- `/dashboard/*` - RESTAURANT and SUPER_ADMIN roles
- `/profile/*` - All authenticated users
- Unauthorized access redirects to home or shows 403

## Key Pages

### Customer Pages
- `/` - Home page with restaurant listings
- `/r/[slug]` - Restaurant menu page
- `/r/[slug]/checkout` - Checkout with wallet integration
- `/profile` - User profile with wallet and order history
- `/orders/[id]` - Individual order tracking

### Restaurant Pages
- `/dashboard` - Restaurant dashboard
- `/dashboard/menu` - Menu management
- `/dashboard/coupons` - Coupon management
- `/dashboard/loot` - Loot mode inventory

### Admin Pages
- `/admin` - Super admin dashboard
- Admin analytics and restaurant management

## Payment Flow

### UPI Prepaid
1. Customer selects "Pay Now (UPI)"
2. Order is created in database
3. UPI deep link generated with restaurant UPI ID
4. Customer redirected to UPI app
5. After payment, customer sees order confirmation

### Cash on Delivery / UPI on Delivery
1. Customer selects payment method
2. Order is created with PENDING status
3. Customer receives order confirmation
4. Payment collected at delivery

## Development

### Project Structure
```
/app
  /(auth)          - Authentication pages
  /admin           - Admin dashboard
  /dashboard       - Restaurant dashboard
  /profile         - Customer profile
  /r/[slug]        - Restaurant pages
  /orders          - Order tracking
/components
  /providers       - Auth and Cart context
  /ui              - shadcn/ui components
/lib
  /supabase        - Supabase client and types
/supabase
  /migrations      - Database migrations
```

### Database Migrations
All database changes are tracked in `/supabase/migrations/`. Key migrations:
- `create_anantapur_os_schema.sql` - Initial schema
- `add_wallet_and_image_url_columns.sql` - Wallet functionality
- `fix_security_issues_and_consolidate_policies_v*.sql` - RLS improvements

## Security Considerations

1. **Row Level Security**: All tables have RLS policies
2. **Role Validation**: Server-side role checks in middleware
3. **Data Isolation**: Users can only access their own data
4. **Wallet Constraints**: Wallet balance cannot be negative
5. **Profile Auto-creation**: Trigger creates profile on user signup

## Additional Configuration

For manual Supabase dashboard configuration, see `SECURITY_CONFIG.md`:
- Auth DB connection strategy (percentage-based)
- Leaked password protection (HaveIBeenPwned integration)

## License

Proprietary - All rights reserved
