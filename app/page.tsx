'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { useCart } from '@/components/providers/cart-provider';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase/client';
import { 
  Loader2, Search, ShoppingCart, ChefHat, Clock, MapPin, 
  User, Flame, Bike, Zap, Gift, Sparkles, Utensils, Pizza, Sandwich,
  Navigation, ChevronDown, Bell, CheckCircle2
} from 'lucide-react';
import { formatPrice } from '@/lib/format';

// --- EXPANSION-READY LOCATIONS (Anantapur & Tadipatri) ---
const POPULAR_LOCATIONS = [
  "Clock Tower, Anantapur",
  "JNTU University, Anantapur",
  "Sapthagiri Circle, Anantapur",
  "Ramtirtham, Anantapur",
  "Tadipatri Bus Stand",
  "Gandhi Nagar, Tadipatri",
  "Sanjivini Hospital Area, Tadipatri",
  "SKU University Campus"
];

// --- REGIONAL LIVE UPDATES ---
const LIVE_UPDATES = [
  "Someone in Clock Tower just ordered Chicken Biryani 🍗",
  "New order from JNTU Hostel: 2x Large Pizzas 🍕",
  "Raju's Kitchen (Tadipatri) is trending right now! 🔥",
  "Siva in Anantapur just saved ₹150 on a Mystery Box 🎁",
  "5 people are looking at Spicy Shawarma near Sapthagiri Circle 🥙"
];

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  delivery_fee: number;
  free_delivery_threshold: number | null;
  is_active: boolean;
}

interface LootItem {
  id: string;
  name: string;
  selling_price: number;
  base_price: number;
  stock_remaining: number;
  is_mystery: boolean;
  loot_discount_percentage: number | null;
  loot_description: string | null;
  image_url: string | null;
  restaurant_id: string;
  restaurants: {
    name: string;
    slug: string;
  };
}

export default function Home() {
  const { user, profile, loading: authLoading } = useAuth();
  const { itemCount } = useCart();
  const router = useRouter();
  
  // Data State
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState<Restaurant[]>([]);
  const [lootItems, setLootItems] = useState<LootItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // UI State
  const [locationName, setLocationName] = useState<string>('Select Location');
  const [isLocating, setIsLocating] = useState(false);
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [currentUpdateIndex, setCurrentUpdateIndex] = useState(0);

  useEffect(() => {
    if (!authLoading && user && profile) {
      if (profile.role === 'SUPER_ADMIN') router.push('/admin');
      if (profile.role === 'RESTAURANT') router.push('/dashboard');
    }
  }, [user, profile, authLoading, router]);

  useEffect(() => {
    const fetchData = async () => {
      const [restaurantsResult, lootItemsResult] = await Promise.all([
        supabase.from('restaurants').select('*').eq('is_active', true).order('name'),
        supabase.from('menu_items')
          .select(`*, restaurants!inner(name, slug, is_active)`)
          .eq('is_clearance', true)
          .eq('is_available', true)
          .eq('restaurants.is_active', true)
          .gt('stock_remaining', 0)
          .order('stock_remaining', { ascending: true })
          .limit(6)
      ]);

      if (restaurantsResult.data) {
        setRestaurants(restaurantsResult.data);
        setFilteredRestaurants(restaurantsResult.data);
      }
      if (lootItemsResult.data) setLootItems(lootItemsResult.data as any);
      setLoading(false);
    };

    fetchData();
    detectLocation(); // Auto-detect on load

    // Ticker Interval
    const interval = setInterval(() => {
      setCurrentUpdateIndex((prev) => (prev + 1) % LIVE_UPDATES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = restaurants.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()));
      setFilteredRestaurants(filtered);
    } else {
      setFilteredRestaurants(restaurants);
    }
  }, [searchQuery, restaurants]);

  const detectLocation = () => {
    setIsLocating(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async () => {
          setTimeout(() => {
            // In a real app, use Reverse Geocoding API here.
            // For now, defaulting to the district hub.
            setLocationName('Anantapur (GPS Detected)');
            setIsLocating(false);
          }, 1500);
        },
        () => {
          setLocationName('Select Location');
          setIsLocating(false);
        }
      );
    } else {
      setIsLocating(false);
    }
  };

  const handleManualLocation = (loc: string) => {
    setLocationName(loc);
    setIsLocationOpen(false);
  };

  const mysteryItems = lootItems.filter(item => item.is_mystery);
  const liveLootItems = lootItems.filter(item => !item.is_mystery);

  return (
    <div className="min-h-screen bg-[#f8f9fa] pb-20 font-sans">
      
      {/* 1. LIVE CRAVINGS TICKER (Regional) */}
      <div className="bg-black text-white text-[10px] sm:text-xs py-1.5 overflow-hidden relative z-50">
        <div className="container mx-auto px-4 flex items-center justify-center gap-2 animate-in fade-in duration-1000 key={currentUpdateIndex}">
          <Bell className="w-3 h-3 text-orange-500 animate-bounce" />
          <span className="font-medium tracking-wide truncate">
            {LIVE_UPDATES[currentUpdateIndex]}
          </span>
        </div>
      </div>

      {/* 2. GLASS HEADER */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100 shadow-sm transition-all duration-300">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            
            {/* Logo & Location */}
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 bg-gradient-to-tr from-orange-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20 transform hover:scale-105 transition-transform">
                <ChefHat className="w-6 h-6 text-white" />
              </div>
              
              <div 
                className="flex flex-col cursor-pointer group" 
                onClick={() => setIsLocationOpen(true)}
              >
                <div className="flex items-center gap-1 text-[10px] font-bold text-orange-600 uppercase tracking-widest">
                  <Navigation className="w-3 h-3" />
                  {isLocating ? 'Locating...' : 'Delivering To'}
                </div>
                <div className="flex items-center gap-1 text-gray-900 text-sm font-bold group-hover:text-orange-600 transition-colors">
                  <span className="truncate max-w-[140px] sm:max-w-[300px]">{locationName}</span>
                  <ChevronDown className="w-3 h-3 text-gray-400" />
                </div>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              {!user ? (
                <>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => router.push('/rider-signup')}
                    className="hidden md:flex text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded-full"
                  >
                    <Bike className="w-4 h-4 mr-2" />
                    Ride
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => router.push('/partner')}
                    className="hidden sm:flex border-orange-200 text-orange-700 hover:bg-orange-50 hover:text-orange-800 rounded-full"
                  >
                    Partner
                  </Button>
                </>
              ) : null}
              
              {itemCount > 0 && (
                <Button 
                  size="sm" 
                  className="bg-black text-white hover:bg-gray-800 rounded-full px-4 shadow-lg shadow-black/10 transition-all hover:scale-105"
                  onClick={() => {
                    const firstRestaurantInCart = JSON.parse(localStorage.getItem('cart') || '[]')[0]?.restaurant_id;
                    if (firstRestaurantInCart) {
                      const restaurant = restaurants.find(r => r.id === firstRestaurantInCart);
                      if (restaurant) router.push(`/r/${restaurant.slug}/checkout`);
                    }
                  }}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  <span className="font-bold">{itemCount}</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 3. PREMIUM HERO SECTION */}
      <div className="relative bg-[#1a1c20] text-white pt-16 pb-24 px-4 rounded-b-[3rem] shadow-2xl overflow-hidden mb-10">
        {/* Abstract "Food Shapes" Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 right-[5%] w-32 h-32 bg-orange-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-10 left-[10%] w-40 h-40 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-700"></div>
          <Pizza className="absolute top-12 right-[15%] w-16 h-16 text-white/5 rotate-12" />
          <Utensils className="absolute bottom-20 left-[5%] w-20 h-20 text-white/5 -rotate-12" />
        </div>

        <div className="relative z-10 container mx-auto text-center max-w-2xl">
          <Badge className="bg-white/10 text-white border-white/20 backdrop-blur-md mb-6 px-4 py-1.5 text-xs font-medium rounded-full hover:bg-white/20 transition-colors cursor-default">
            🚀 #1 Food Delivery in Anantapur District
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-black mb-6 tracking-tight leading-tight">
            Craving something <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">Delicious?</span>
          </h1>
          
          {/* Enhanced Search Bar */}
          <div className="relative max-w-lg mx-auto group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-500 to-red-600 rounded-full blur opacity-30 group-hover:opacity-60 transition duration-500"></div>
            <div className="relative flex items-center bg-white rounded-full p-1.5 shadow-2xl">
              <div className="pl-4 pr-2 text-gray-400">
                <Search className="w-5 h-5" />
              </div>
              <input 
                type="text"
                placeholder="Biryani, Pizza, Cake..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-gray-900 placeholder-gray-400 outline-none h-10 text-sm sm:text-base w-full"
              />
              <Button className="rounded-full px-6 h-10 bg-black hover:bg-gray-800 font-bold text-sm transition-transform active:scale-95">
                Search
              </Button>
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 max-w-7xl -mt-16 relative z-20 space-y-12">
        
        {/* 4. "WHAT'S ON YOUR MIND" (Category Slider) */}
        <div className="bg-white rounded-2xl p-6 shadow-xl shadow-gray-200/50 border border-gray-100">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">What's on your mind?</h3>
          <div className="flex gap-4 sm:gap-8 overflow-x-auto no-scrollbar pb-2">
            {[
              { name: 'Biryani', icon: '🥘', color: 'bg-orange-100' },
              { name: 'Pizza', icon: '🍕', color: 'bg-red-100' },
              { name: 'Burger', icon: '🍔', color: 'bg-yellow-100' },
              { name: 'Shawarma', icon: '🥙', color: 'bg-green-100' },
              { name: 'Desserts', icon: '🧁', color: 'bg-pink-100' },
              { name: 'Drinks', icon: '🥤', color: 'bg-blue-100' },
            ].map((cat) => (
              <div key={cat.name} className="flex flex-col items-center gap-2 cursor-pointer group min-w-[70px]">
                <div className={`${cat.color} w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                  {cat.icon}
                </div>
                <span className="text-xs font-bold text-gray-600 group-hover:text-gray-900">{cat.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 5. LOOT & MYSTERY SECTION (Bento Grid Style) */}
        {(mysteryItems.length > 0 || liveLootItems.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Mystery Box Card */}
            {mysteryItems.length > 0 && (
              <div className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-3xl p-6 relative overflow-hidden shadow-2xl shadow-purple-900/20 group cursor-pointer border border-purple-500/20">
                <div className="absolute top-0 right-0 w-40 h-40 bg-purple-500/30 rounded-full blur-3xl -mr-10 -mt-10"></div>
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <Badge className="bg-purple-500 text-white border-0 mb-2">MYSTERY BOX</Badge>
                      <h2 className="text-2xl font-bold text-white">Surprise Savings</h2>
                      <p className="text-purple-200 text-sm">Get premium food at insane prices.</p>
                    </div>
                    <Gift className="w-12 h-12 text-purple-300 animate-bounce" />
                  </div>
                  
                  <div className="space-y-3">
                    {mysteryItems.slice(0, 2).map(item => (
                      <div key={item.id} onClick={() => router.push(`/r/${item.restaurants.slug}`)} className="bg-white/10 backdrop-blur-md p-3 rounded-xl flex items-center justify-between hover:bg-white/20 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-xl">🎁</div>
                          <div>
                            <div className="text-white font-bold text-sm">{item.name}</div>
                            <div className="text-purple-200 text-xs">{item.restaurants.name}</div>
                          </div>
                        </div>
                        <Badge className="bg-white text-purple-900 font-bold">{formatPrice(item.selling_price)}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Live Loot Card */}
            {liveLootItems.length > 0 && (
              <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-3xl p-6 relative overflow-hidden shadow-2xl shadow-orange-500/20 group cursor-pointer border border-orange-400/20">
                <div className="absolute bottom-0 left-0 w-40 h-40 bg-yellow-400/30 rounded-full blur-3xl -ml-10 -mb-10"></div>
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <Badge className="bg-white text-orange-600 border-0 mb-2 animate-pulse">LIVE NOW</Badge>
                      <h2 className="text-2xl font-bold text-white">Flash Deals</h2>
                      <p className="text-orange-100 text-sm">Limited stock. Gone in minutes.</p>
                    </div>
                    <Zap className="w-12 h-12 text-yellow-300" />
                  </div>
                  
                  <div className="space-y-3">
                    {liveLootItems.slice(0, 2).map(item => (
                      <div key={item.id} onClick={() => router.push(`/r/${item.restaurants.slug}`)} className="bg-white/10 backdrop-blur-md p-3 rounded-xl flex items-center justify-between hover:bg-white/20 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center text-xl">⚡</div>
                          <div>
                            <div className="text-white font-bold text-sm">{item.name}</div>
                            <div className="text-orange-100 text-xs">{item.restaurants.name}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="block text-white font-bold text-sm">{formatPrice(item.selling_price)}</span>
                          <span className="block text-orange-200 text-[10px] line-through">{formatPrice(item.base_price)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 6. POPULAR RESTAURANTS LIST (Dynamic Header) */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-500 fill-yellow-500" />
              Popular in Your Area
            </h2>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
            </div>
          ) : filteredRestaurants.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
              <Search className="h-8 w-8 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-900">No restaurants found</h3>
              <p className="text-gray-500 text-sm">Try searching for something else</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRestaurants.map((restaurant, index) => (
                <Card
                  key={restaurant.id}
                  className="group border-0 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden bg-white rounded-2xl cursor-pointer ring-1 ring-gray-100 hover:ring-orange-100"
                  onClick={() => router.push(`/r/${restaurant.slug}`)}
                >
                  <div className="relative h-48 overflow-hidden">
                    {restaurant.image_url ? (
                      <img
                        src={restaurant.image_url}
                        alt={restaurant.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                        <ChefHat className="w-12 h-12 text-gray-300" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60"></div>
                    
                    <div className="absolute bottom-4 left-4 text-white">
                      <h3 className="font-bold text-xl mb-1 drop-shadow-md">{restaurant.name}</h3>
                      <div className="flex items-center gap-2 text-xs font-medium">
                        <span className="bg-green-500 px-1.5 py-0.5 rounded text-white flex items-center gap-1">
                          ★ 4.2
                        </span>
                        <span className="opacity-90">• 35 mins • ₹{restaurant.delivery_fee} Delivery</span>
                      </div>
                    </div>
                  </div>
                  
                  {restaurant.free_delivery_threshold && (
                    <div className="px-4 py-2 bg-blue-50 text-blue-700 text-xs font-bold flex items-center gap-2 border-t border-blue-100">
                      <Gift className="w-3 h-3" />
                      FREE Delivery over ₹{restaurant.free_delivery_threshold}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* 7. ABOUT SECTION (EXPANSION FOCUSED) */}
      <section className="container mx-auto px-4 mt-24 mb-10">
        <div className="bg-[#1a1c20] rounded-[2.5rem] p-8 sm:p-12 text-white relative overflow-hidden shadow-2xl">
          <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-block bg-orange-500/20 text-orange-300 font-bold px-4 py-1 rounded-full text-xs uppercase tracking-widest mb-6">
                Our Mission
              </div>
              <h2 className="text-3xl sm:text-4xl font-black mb-6 leading-tight">
                Built for <span className="text-orange-500">Tier-2 Cities</span>
              </h2>
              <p className="text-gray-400 text-lg leading-relaxed mb-8">
                GO515 connects local restaurants in Anantapur District with food lovers like you. We believe great food delivery shouldn't be limited to metros.
              </p>
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-bold text-white mb-2 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-400" /> Late Night Loot
                  </h4>
                  <p className="text-xs text-gray-500">Exclusive flash sales every night.</p>
                </div>
                <div>
                  <h4 className="font-bold text-white mb-2 flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-400" /> No Login Required
                  </h4>
                  <p className="text-xs text-gray-500">Browse and checkout as a guest.</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white/5 p-8 rounded-3xl backdrop-blur-sm border border-white/10">
              <h3 className="font-bold text-xl mb-6 text-white">Why Choose GO515?</h3>
              <ul className="space-y-4">
                {[
                  "Real-time order tracking",
                  "Direct restaurant prices (No markup)",
                  "Support local businesses",
                  "Fast & reliable delivery fleet"
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                    <span className="text-gray-300 text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 8. MANUAL LOCATION MODAL */}
      <Dialog open={isLocationOpen} onOpenChange={setIsLocationOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Location</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Button 
              variant="outline" 
              className="w-full justify-start text-orange-600 border-orange-200 bg-orange-50 hover:bg-orange-100"
              onClick={() => {
                detectLocation();
                setIsLocationOpen(false);
              }}
            >
              <Navigation className="w-4 h-4 mr-2" />
              Use Current Location (GPS)
            </Button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or choose popular area</span>
              </div>
            </div>

            <div className="grid gap-2">
              {POPULAR_LOCATIONS.map((loc) => (
                <Button
                  key={loc}
                  variant="ghost"
                  className="w-full justify-start font-normal"
                  onClick={() => handleManualLocation(loc)}
                >
                  <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                  {loc}
                </Button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}