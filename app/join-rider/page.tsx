'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bike, ArrowRight, Shield, Wallet, Clock } from 'lucide-react';
import { toast } from 'sonner';

export default function JoinRiderPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    vehicleNumber: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error('Please login first');
        router.push('/login?redirect=/join-rider');
        return;
      }

      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }

      if (existingProfile) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            role: 'RIDER',
            name: formData.name,
            phone: formData.phone,
            vehicle_number: formData.vehicleNumber,
          })
          .eq('id', user.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            role: 'RIDER',
            name: formData.name,
            phone: formData.phone,
            vehicle_number: formData.vehicleNumber,
          });

        if (insertError) throw insertError;
      }

      toast.success('Welcome to GO515 Partner! Your application is under review.');
      router.push('/rider/dashboard');
    } catch (error) {
      console.error('Error joining as rider:', error);
      toast.error('Failed to submit application. Please try again.');
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
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Join GO515 Partner</h1>
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
              <CardTitle>Rider Application</CardTitle>
              <CardDescription>
                Fill in your details to start your journey with GO515 Partner
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Full Name</Label>
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
                  <Label htmlFor="phone">Phone Number</Label>
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
                  <Label htmlFor="vehicleNumber">Vehicle Number</Label>
                  <Input
                    id="vehicleNumber"
                    type="text"
                    placeholder="e.g., AP 39 AB 1234"
                    value={formData.vehicleNumber}
                    onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value })}
                    required
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900">
                    <strong>Note:</strong> After submission, your application will be reviewed by our team.
                    You can continue using GO515 to order food while waiting for approval.
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-orange-500 hover:bg-orange-600"
                  size="lg"
                  disabled={loading}
                >
                  {loading ? 'Submitting...' : 'Submit Application'}
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </form>
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
