'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2, HardHat, ShieldCheck, BarChart3 } from 'lucide-react';

type Role = 'ENGINEER' | 'ADMIN' | 'MANAGER';

const ROLES: { value: Role; label: string; desc: string; icon: React.ReactNode }[] = [
  {
    value: 'ENGINEER',
    label: 'Engineer',
    desc: 'Create & submit CT adequacy checks',
    icon: <HardHat className="h-5 w-5" />,
  },
  {
    value: 'ADMIN',
    label: 'Admin / Team Lead',
    desc: 'Review, approve or reject computations',
    icon: <ShieldCheck className="h-5 w-5" />,
  },
  {
    value: 'MANAGER',
    label: 'Manager',
    desc: 'Dashboard overview & PDF reports',
    icon: <BarChart3 className="h-5 w-5" />,
  },
];

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    organizationName: '',
    role: 'ENGINEER' as Role,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Signup failed');
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-card p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
          <CardDescription>CT/VT Adequacy Check Platform</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Role selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Your Role</label>
              <div className="grid grid-cols-3 gap-2">
                {ROLES.map(r => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, role: r.value }))}
                    className={`flex flex-col items-center gap-1 rounded-lg border p-3 text-center transition-colors
                      ${formData.role === r.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-primary/50'}`}
                  >
                    {r.icon}
                    <span className="text-xs font-semibold">{r.label}</span>
                    <span className="text-[10px] text-muted-foreground leading-tight">{r.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Full Name</label>
              <Input name="name" value={formData.name} onChange={handleChange}
                placeholder="Your full name" disabled={loading} required />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input type="email" name="email" value={formData.email} onChange={handleChange}
                placeholder="you@company.com" disabled={loading} required />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <Input type="password" name="password" value={formData.password} onChange={handleChange}
                placeholder="At least 8 characters" disabled={loading} required />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Organization / Company</label>
              <Input name="organizationName" value={formData.organizationName} onChange={handleChange}
                placeholder="e.g. Hitachi Energy" disabled={loading} required />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating account...</> : 'Create Account'}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-primary hover:underline">Sign in</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
