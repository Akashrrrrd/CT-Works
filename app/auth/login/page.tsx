'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Loader2, Zap } from 'lucide-react';

const ROLES = [
  { value: 'ENGINEER', label: 'Engineer'     },
  { value: 'ADMIN',    label: 'Admin / Lead'  },
  { value: 'MANAGER',  label: 'Manager'       },
];

export default function LoginPage() {
  const router = useRouter();
  const [role,       setRole]       = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [password,   setPassword]   = useState('');
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');

  // Redirect if already authenticated
  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(r => { if (r.ok) router.replace('/dashboard'); })
      .catch(() => {});
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role || !employeeId || !password) return;
    setLoading(true);
    setError('');
    try {
      const res  = await fetch('/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ employeeId: employeeId.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      // Verify the returned role matches what was selected
      if (data.user.role !== role) {
        throw new Error(`This Employee ID belongs to a ${data.user.role.toLowerCase()}, not a ${role.toLowerCase()}.`);
      }

      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-card p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center space-y-2 pb-4">
          <div className="flex items-center justify-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            <CardTitle className="text-xl font-bold">CT/VT Adequacy</CardTitle>
          </div>
          <CardDescription className="text-xs">IEC 61869 — Protection Relay CT Check Platform</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">{error}</AlertDescription>
              </Alert>
            )}

            {/* Role selector */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Role</label>
              <Select value={role} onValueChange={v => { setRole(v); setError(''); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Employee ID */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Employee ID</label>
              <Input
                value={employeeId}
                onChange={e => { setEmployeeId(e.target.value); setError(''); }}
                placeholder="e.g. ENG-001"
                disabled={loading}
                required
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Password</label>
              <Input
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                placeholder="Enter your password"
                disabled={loading}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={!role || !employeeId || !password || loading}>
              {loading
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in...</>
                : 'Sign In'}
            </Button>
          </form>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Contact your Admin to get your Employee ID
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
