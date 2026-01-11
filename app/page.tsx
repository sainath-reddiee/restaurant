'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Loader2, ShoppingBag, Store, ChefHat } from 'lucide-react';

export default function Home() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && profile) {
      switch (profile.role) {
        case 'SUPER_ADMIN':
          router.push('/admin');
          break;
        case 'RESTAURANT':
          router.push('/dashboard');
          break;
        case 'CUSTOMER':
          router.push('/menu');
          break;
        default:
          break;
      }
    }
  }, [user, profile, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (user && profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-orange-50">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-orange-500 rounded-2xl mb-4">
              <ChefHat className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 tracking-tight">
              Anantapur OS
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 max-w-2xl mx-auto">
              Digital Storefront & Logistics Platform for Local Restaurants
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 pt-8">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-orange-100 rounded-xl mb-4">
                <ShoppingBag className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Order Food</h3>
              <p className="text-gray-600 text-sm">
                Browse local restaurants and order delicious food with voice commands
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-amber-100 rounded-xl mb-4">
                <Store className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Loot Mode</h3>
              <p className="text-gray-600 text-sm">
                Flash sales on excess inventory at discounted prices
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-xl mb-4">
                <ChefHat className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Mystery Boxes</h3>
              <p className="text-gray-600 text-sm">
                Surprise meals at great prices, perfect for adventurous eaters
              </p>
            </div>
          </div>

          <div className="pt-8 space-y-4">
            <Button
              size="lg"
              className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-6 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all"
              onClick={() => router.push('/login')}
            >
              Get Started
            </Button>
            <p className="text-sm text-gray-500">
              For restaurant owners and super admins
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
