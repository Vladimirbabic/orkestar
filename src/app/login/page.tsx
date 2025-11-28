'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Sparkles } from 'lucide-react';

type AuthMode = 'signin' | 'signup';

export default function LoginPage() {
  const router = useRouter();
  const { signIn, signUp, isLoading: authLoading } = useAuth();
  
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    // Validation
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (mode === 'signup') {
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      if (mode === 'signin') {
        const { error: signInError } = await signIn(email, password);
        if (signInError) {
          setError(signInError);
        } else {
          router.push('/');
        }
      } else {
        const { error: signUpError } = await signUp(email, password);
        if (signUpError) {
          setError(signUpError);
        } else {
          setSuccessMessage('Account created! Check your email to confirm your account, then sign in.');
          setMode('signin');
          setPassword('');
          setConfirmPassword('');
        }
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin');
    setError(null);
    setSuccessMessage(null);
    setPassword('');
    setConfirmPassword('');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-background" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
      
      <div className="relative flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          {/* Logo/Brand */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary mb-4 shadow-lg">
              <Sparkles className="w-7 h-7 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Orkestar</h1>
            <p className="text-muted-foreground text-sm mt-1">AI Workflow Automation</p>
          </div>

          {/* Auth Card */}
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="text-xl text-center">
                {mode === 'signin' ? 'Welcome back' : 'Create an account'}
              </CardTitle>
              <CardDescription className="text-center">
                {mode === 'signin' 
                  ? 'Enter your credentials to sign in' 
                  : 'Enter your email to create your account'}
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              {/* Success Message */}
              {successMessage && (
                <div className="mb-4 p-3 rounded-md bg-primary/10 border border-primary/20 text-primary text-sm">
                  {successMessage}
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="mb-4 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email Field */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    disabled={isSubmitting}
                    autoComplete="email"
                  />
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={isSubmitting}
                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  />
                </div>

                {/* Confirm Password Field (Sign Up only) */}
                {mode === 'signup' && (
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      disabled={isSubmitting}
                      autoComplete="new-password"
                    />
                  </div>
                )}

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {mode === 'signin' ? 'Signing in...' : 'Creating account...'}
                    </>
                  ) : (
                    mode === 'signin' ? 'Sign in' : 'Create account'
                  )}
                </Button>
              </form>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4">
              <div className="text-sm text-muted-foreground text-center">
                {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}
                <button
                  onClick={toggleMode}
                  className="ml-1 text-primary hover:text-primary/80 font-medium transition-colors"
                  disabled={isSubmitting}
                  type="button"
                >
                  {mode === 'signin' ? 'Sign up' : 'Sign in'}
                </button>
              </div>
            </CardFooter>
          </Card>

          {/* Footer */}
          <p className="text-center text-muted-foreground text-xs mt-6">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}
