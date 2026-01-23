import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, Mail, Lock, User, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/lib/SupabaseClient'; // Adjust path to your public client

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const navigate = useNavigate();

  // Helper to get the correct endpoint URL
  const getEndpointUrl = (functionName: string) => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://nnljrawwhibazudjudht.supabase.co';
    // Remove trailing slash if it exists to prevent double slashes
    const cleanUrl = supabaseUrl.replace(/\/$/, '');
    return `${cleanUrl}/functions/v1/${functionName}`;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const form = e.target as HTMLFormElement;
    const email = (form.elements.namedItem('email') as HTMLInputElement)?.value;
    const password = (form.elements.namedItem('password') as HTMLInputElement)?.value;

    console.log('Sign in attempt:', { email, password: '***' });

    if (!email || !password) {
      toast.error('Please fill in all fields');
      setIsLoading(false);
      return;
    }

    try {
      const endpoint = getEndpointUrl('auth-login');
      console.log('Calling:', endpoint);

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      console.log('Response:', { status: res.status, data });

      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Store session data
      if (data.session) {
        localStorage.setItem('session', JSON.stringify(data.session));
        localStorage.setItem('user', JSON.stringify(data.user));
      }

      toast.success('Welcome back!');
      navigate('/');
    } catch (err: any) {
      console.error('Sign in error:', err);
      toast.error(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsLoading(true);

  const form = e.target as HTMLFormElement;
  const full_name = (form.elements.namedItem('name') as HTMLInputElement)?.value;
  const email = (form.elements.namedItem('signup-email') as HTMLInputElement)?.value;
  const password = (form.elements.namedItem('signup-password') as HTMLInputElement)?.value;

  console.log('Sign up attempt:', { full_name, email, password: '***' });

  if (!full_name || !email || !password) {
    toast.error('Please fill in all fields');
    setIsLoading(false);
    return;
  }

  if (password.length < 8) {
    toast.error('Password must be at least 8 characters');
    setIsLoading(false);
    return;
  }

  try {
    // Direct client-side signup – this respects emailRedirectTo perfectly
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/profile-setup`,
        data: { full_name }, // Stores full_name in user_metadata
      },
    });

    if (error) throw error;

    console.log('Signup response:', data);

    toast.success('Account created! Please check your email to verify your account.');
    form.reset();
  } catch (err: any) {
    console.error('Registration error:', err);
    toast.error(err.message || 'Registration failed');
  } finally {
    setIsLoading(false);
  }
};

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const form = e.target as HTMLFormElement;
    const email = (form.elements.namedItem('reset-email') as HTMLInputElement)?.value;

    console.log('Password reset attempt:', { email });

    if (!email) {
      toast.error('Please enter your email');
      setIsLoading(false);
      return;
    }

    try {
      const endpoint = getEndpointUrl('auth-reset-password');
      console.log('Calling:', endpoint);

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      console.log('Reset password response:', { status: res.status, data });

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send reset email');
      }

      toast.success(data.message || 'If the email exists, a reset link will be sent.');
      form.reset();
      setShowResetPassword(false);
    } catch (err: any) {
      console.error('Reset password error:', err);
      toast.error(err.message || 'Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    toast.info('Google Sign-In requires OAuth setup. Coming soon!');
  };

  return (
    <div className="min-h-screen bg-gradient-warm flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-charcoal text-white p-12 flex-col justify-between relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-96 h-96 bg-primary rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-64 h-64 bg-secondary rounded-full blur-3xl" />
        </div>

        <div className="relative">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <BookOpen className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-serif text-xl font-bold">
              Book<span className="text-primary">Haven</span>
            </span>
          </Link>
        </div>

        <div className="relative">
          <h1 className="font-serif text-4xl font-bold mb-4">
            Welcome to Your<br />
            <span className="text-primary">Literary Journey</span>
          </h1>
          <p className="text-white/70 text-lg max-w-md">
            Sign in to access your orders, wishlist, and exclusive member benefits. 
            New here? Create an account in seconds.
          </p>
        </div>

        <div className="relative text-white/50 text-sm">
          © 2024 BookHaven. All rights reserved.
        </div>
      </div>

      {/* Right Side - Auth Forms */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8 text-center">
            <Link to="/" className="inline-flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
                <BookOpen className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-serif text-xl font-bold">
                Book<span className="text-primary">Haven</span>
              </span>
            </Link>
          </div>

          {/* Back Link */}
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-8 text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to store
          </Link>

          {/* Forgot Password Form */}
          {showResetPassword ? (
            <div className="space-y-6">
              <div>
                <h2 className="font-serif text-2xl font-bold mb-2">Reset Password</h2>
                <p className="text-muted-foreground">Enter your email to receive a reset link</p>
              </div>

              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="reset-email" 
                      name="reset-email"
                      type="email" 
                      placeholder="you@example.com" 
                      className="pl-10"
                      required 
                    />
                  </div>
                </div>

                <Button type="submit" variant="hero" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Sending...' : 'Send Reset Link'}
                </Button>

                <Button 
                  type="button" 
                  variant="ghost" 
                  className="w-full" 
                  onClick={() => setShowResetPassword(false)}
                >
                  Back to Sign In
                </Button>
              </form>
            </div>
          ) : (
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-8">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              {/* Sign In Form */}
              <TabsContent value="signin">
                <div className="space-y-6">
                  <div>
                    <h2 className="font-serif text-2xl font-bold mb-2">Welcome back</h2>
                    <p className="text-muted-foreground">Sign in to your account to continue</p>
                  </div>

                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="email" 
                          name="email"
                          type="email" 
                          placeholder="you@example.com" 
                          className="pl-10"
                          required 
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label htmlFor="password">Password</Label>
                        <button 
                          type="button"
                          onClick={() => setShowResetPassword(true)}
                          className="text-sm text-primary hover:underline"
                        >
                          Forgot password?
                        </button>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="password" 
                          name="password"
                          type={showSignInPassword ? 'text' : 'password'}
                          placeholder="••••••••" 
                          className="pl-10 pr-10"
                          required 
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground focus:outline-none"
                          onClick={() => setShowSignInPassword((v) => !v)}
                          aria-label={showSignInPassword ? 'Hide password' : 'Show password'}
                        >
                          {showSignInPassword ? (
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9-4-9-7s4-7 9-7c1.13 0 2.21.19 3.22.54M19.07 4.93A9.97 9.97 0 0121 12c0 3-4 7-9 7a9.97 9.97 0 01-7.07-2.93M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth="2" /></svg>
                          ) : (
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" /><circle cx="12" cy="12" r="3" /></svg>
                          )}
                        </button>
                      </div>
                    </div>

                    <Button type="submit" variant="hero" className="w-full" disabled={isLoading}>
                      {isLoading ? 'Signing in...' : 'Sign In'}
                    </Button>
                  </form>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                    </div>
                  </div>

                  <Button 
                    variant="outline" 
                    className="w-full gap-2" 
                    onClick={handleGoogleSignIn}
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Continue with Google
                  </Button>
                </div>
              </TabsContent>

              {/* Sign Up Form */}
              <TabsContent value="signup">
                <div className="space-y-6">
                  <div>
                    <h2 className="font-serif text-2xl font-bold mb-2">Create an account</h2>
                    <p className="text-muted-foreground">Join BookHaven and start your reading journey</p>
                  </div>

                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="name" 
                          name="name"
                          type="text" 
                          placeholder="John Doe" 
                          className="pl-10"
                          required 
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="signup-email" 
                          name="signup-email"
                          type="email" 
                          placeholder="you@example.com" 
                          className="pl-10"
                          required 
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="signup-password" 
                          name="signup-password"
                          type={showSignUpPassword ? 'text' : 'password'}
                          placeholder="••••••••" 
                          className="pl-10 pr-10"
                          required 
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground focus:outline-none"
                          onClick={() => setShowSignUpPassword((v) => !v)}
                          aria-label={showSignUpPassword ? 'Hide password' : 'Show password'}
                        >
                          {showSignUpPassword ? (
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9-4-9-7s4-7 9-7c1.13 0 2.21.19 3.22.54M19.07 4.93A9.97 9.97 0 0121 12c0 3-4 7-9 7a9.97 9.97 0 01-7.07-2.93M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth="2" /></svg>
                          ) : (
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" /><circle cx="12" cy="12" r="3" /></svg>
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Must be at least 8 characters with a letter and number
                      </p>
                    </div>

                    <Button type="submit" variant="hero" className="w-full" disabled={isLoading}>
                      {isLoading ? 'Creating account...' : 'Create Account'}
                    </Button>
                  </form>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                    </div>
                  </div>

                  <Button 
                    variant="outline" 
                    className="w-full gap-2" 
                    onClick={handleGoogleSignIn}
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Continue with Google
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    By creating an account, you agree to our{' '}
                    <a href="#" className="text-primary hover:underline">Terms of Service</a>
                    {' '}and{' '}
                    <a href="#" className="text-primary hover:underline">Privacy Policy</a>
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;