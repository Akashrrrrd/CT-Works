'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Eye, 
  EyeOff, 
  User, 
  Lock, 
  AlertCircle, 
  Loader2,
  HardHat,
  ShieldCheck,
  BarChart3
} from 'lucide-react';

const ROLES = [
  { value: 'ENGINEER', label: 'Engineer', color: 'text-blue-600' },
  { value: 'ADMIN', label: 'Admin / Lead', color: 'text-amber-600' },
  { value: 'MANAGER', label: 'Manager', color: 'text-emerald-600' },
];

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          employeeId: employeeId.trim(), 
          password,
          rememberMe 
        }),
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

  const getRoleIcon = (roleValue: string) => {
    switch (roleValue) {
      case 'ENGINEER':
        return <HardHat className="h-4 w-4" />;
      case 'ADMIN':
        return <ShieldCheck className="h-4 w-4" />;
      case 'MANAGER':
        return <BarChart3 className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const selectedRole = ROLES.find(r => r.value === role);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-card p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Sign In</CardTitle>
          <CardDescription className="text-center">
            CT/VT Adequacy Check Platform
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Access Level</label>
              <Select value={role} onValueChange={v => { setRole(v); setError(''); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map(r => (
                    <SelectItem key={r.value} value={r.value}>
                      <div className="flex items-center space-x-2">
                        {getRoleIcon(r.value)}
                        <span>{r.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedRole && (
                <p className="text-xs text-muted-foreground">
                  Signing in as <span className={`font-medium ${selectedRole.color}`}>{selectedRole.label}</span>
                </p>
              )}
            </div>

            {/* Employee ID */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Employee ID</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="e.g. ENG-001, ADM-001"
                  value={employeeId}
                  onChange={(e) => { setEmployeeId(e.target.value); setError(''); }}
                  className="pl-10"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  className="pl-10 pr-10"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(!!checked)}
                disabled={loading}
              />
              <label htmlFor="remember" className="text-sm cursor-pointer">
                Remember me
              </label>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={!role || !employeeId || !password || loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          <div className="text-center text-sm text-muted-foreground">
            Don't have an account?{' '}
            <Link href="/auth/signup" className="text-primary hover:underline">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}