'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bike, ArrowRight, Shield, Wallet, Clock, Mail, Lock, Phone, User } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export default function RiderSignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    vehicleNumber: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (formData.password.length < 6) {
        toast.error('Password must be at least 6 characters');
        setLoading(false);
        return;
      }

      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (signUpError) throw signUpError;

      if (!authData.user) {
        throw new Error('Failed to create account');
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: authData.user.id,
          role: 'RIDER',
          full_name: formData.name,
          phone: formData.phone,
          vehicle_number: formData.vehicleNumber,
          is_verified: false,
        });

      if (profileError) throw profileError;

      toast.success('Application submitted! Please wait for admin approval.');
      router.push('/rider/dashboard');
    } catch (error: any) {
      console.error('Error signing up:', error);
      toast.error(error.message || 'Failed to submit application. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-500 rounded-full mb-4">
              <Bike className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Join GO515 as a Rider</h1>
            <p className="text-lg text-gray-600">Start earning by delivering food in Tadipatri</p>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <Wallet className="w-8 h-8 text-orange-500 mb-2" />
                  <h3 className="font-semibold mb-1">Earn ₹40 per delivery</h3>
                  <p className="text-sm text-gray-600">Competitive earnings for each order</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <Clock className="w-8 h-8 text-orange-500 mb-2" />
                  <h3 className="font-semibold mb-1">Flexible Hours</h3>
                  <p className="text-sm text-gray-600">Work whenever you want</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <Shield className="w-8 h-8 text-orange-500 mb-2" />
                  <h3 className="font-semibold mb-1">Safe Platform</h3>
                  <p className="text-sm text-gray-600">Secure and reliable system</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Create Rider Account</CardTitle>
              <CardDescription>
                Fill in your details to start your journey with GO515
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="password" className="flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Minimum 6 characters"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    minLength={6}
                  />
                </div>

                <div>
                  <Label htmlFor="name" className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Full Name
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter your full name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Enter your phone number"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="vehicleNumber" className="flex items-center gap-2">
                    <Bike className="w-4 h-4" />
                    Vehicle Number
                  </Label>
                  <Input
                    id="vehicleNumber"
                    type="text"
                    placeholder="e.g., AP 39 AB 1234"
                    value={formData.vehicleNumber}
                    onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                    required
                  />
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-sm text-amber-900">
                    <strong>Note:</strong> After submission, your application will be reviewed by our admin team.
                    You will be notified once your account is approved and you can start accepting deliveries.
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-orange-500 hover:bg-orange-600"
                  size="lg"
                  disabled={loading}
                >
                  {loading ? 'Creating Account...' : 'Create Account & Apply'}
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Already have an account?{' '}
                  <Link href="/login" className="text-orange-500 hover:text-orange-600 font-semibold">
                    Login here
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="text-center mt-6">
            <Button variant="ghost" onClick={() => router.push('/')}>
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
