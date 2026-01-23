import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, ArrowLeft, BookOpen, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const PasswordChange = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Supabase sends tokens in URL hash: #access_token=...&type=recovery
  const [isValidToken, setIsValidToken] = useState(false);
  const [isCheckingToken, setIsCheckingToken] = useState(true);

  // Extract and validate access token from URL hash on mount
  useEffect(() => {
    const checkRecoveryToken = async () => {
      try {
        // Get hash params from URL (Supabase format: #access_token=...&type=recovery)
        const hashParams = new URLSearchParams(location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const tokenType = hashParams.get('type');

        console.log('Password reset page loaded');
        console.log('Token type:', tokenType);
        console.log('Access token present:', !!accessToken);

        if (tokenType === 'recovery' && accessToken) {
          console.log('✅ Valid recovery token found in URL');
          
          // Verify the session is valid by getting the user
          const { data: { user }, error } = await supabase.auth.getUser(accessToken);
          
          if (error || !user) {
            console.error('❌ Token validation failed:', error);
            toast.error('Invalid or expired reset token');
            setIsValidToken(false);
            setTimeout(() => navigate('/auth'), 2000);
          } else {
            console.log('✅ Token validated successfully for user:', user.id);
            setIsValidToken(true);
          }
        } else {
          console.log('❌ No valid recovery token found in URL');
          toast.error('Invalid or missing reset token');
          setIsValidToken(false);
          setTimeout(() => navigate('/auth'), 2000);
        }
      } catch (err) {
        console.error('Error checking recovery token:', err);
        toast.error('Invalid or expired reset token');
        setIsValidToken(false);
        setTimeout(() => navigate('/auth'), 2000);
      } finally {
        setIsCheckingToken(false);
      }
    };

    checkRecoveryToken();
  }, [location, navigate]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const form = e.target as HTMLFormElement;
    const password = (form.elements.namedItem('password') as HTMLInputElement)?.value;
    const confirm = (form.elements.namedItem('confirm') as HTMLInputElement)?.value;

    console.log('Password change attempt:', {
      passwordLength: password?.length,
      confirmMatch: password === confirm
    });

    // Client-side validation
    if (!password || !confirm) {
      toast.error('Please fill in all fields');
      setIsLoading(false);
      return;
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      setIsLoading(false);
      return;
    }

    if (!/[A-Za-z]/.test(password)) {
      toast.error('Password must contain at least one letter');
      setIsLoading(false);
      return;
    }

    if (!/\d/.test(password)) {
      toast.error('Password must contain at least one number');
      setIsLoading(false);
      return;
    }

    if (password !== confirm) {
      toast.error('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      console.log('Updating password via Supabase Auth...');

      // Use Supabase's updateUser to change password
      // The session is automatically set from the access_token in the URL hash
      const { data, error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        console.error('❌ Password update error:', error);
        throw error;
      }

      console.log('✅ Password updated successfully');

      // Success!
      toast.success('Password changed successfully!', {
        description: 'You can now sign in with your new password.',
        icon: <CheckCircle2 className="h-5 w-5" />
      });
      
      // Clear the form
      form.reset();
      
      // Sign out the user (they'll need to sign in with new password)
      await supabase.auth.signOut();
      console.log('User signed out, redirecting to auth page...');
      
      // Redirect to sign in after 2 seconds
      setTimeout(() => {
        navigate('/auth');
      }, 2000);

    } catch (err: any) {
      console.error('Password change error:', err);
      
      // Handle specific error cases
      if (err.message?.includes('session') || err.message?.includes('token')) {
        toast.error('Reset link has expired. Please request a new one.');
        setTimeout(() => navigate('/auth'), 2000);
      } else if (err.message?.includes('Same password')) {
        toast.error('New password must be different from the current password');
      } else {
        toast.error(err.message || 'Password reset failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading state while checking token
  if (isCheckingToken) {
    return (
      <div className="min-h-screen bg-gradient-warm flex items-center justify-center p-6">
        <div className="text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
            <Lock className="h-8 w-8 text-primary animate-pulse" />
          </div>
          <h2 className="font-serif text-2xl font-bold mb-2">Verifying Reset Link</h2>
          <p className="text-muted-foreground">Please wait...</p>
        </div>
      </div>
    );
  }

  // If no valid token, show error state
  if (!isValidToken) {
    return (
      <div className="min-h-screen bg-gradient-warm flex items-center justify-center p-6">
        <div className="text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 mb-4">
            <Lock className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="font-serif text-2xl font-bold mb-2">Invalid Reset Link</h2>
          <p className="text-muted-foreground mb-6">
            This password reset link is invalid or has expired.
          </p>
          <Button onClick={() => navigate('/auth')} variant="hero">
            Back to Sign In
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-warm flex">
      {/* Left Side - Branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-charcoal text-white p-12 flex-col justify-between relative overflow-hidden">
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
            Create a<br />
            <span className="text-primary">New Password</span>
          </h1>
          <p className="text-white/70 text-lg max-w-md">
            Choose a strong password to keep your account secure. Make sure it's at least 8 characters with a letter and number.
          </p>
        </div>

        <div className="relative text-white/50 text-sm">
          © 2024 BookHaven. All rights reserved.
        </div>
      </div>

      {/* Right Side - Password Change Form */}
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

          <Link 
            to="/auth" 
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-8 text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Sign In
          </Link>

          <div className="space-y-6">
            <div>
              <h2 className="font-serif text-2xl font-bold mb-2">Change Password</h2>
              <p className="text-muted-foreground">Enter your new password below</p>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none transition-colors"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9-4-9-7s4-7 9-7c1.13 0 2.21.19 3.22.54M19.07 4.93A9.97 9.97 0 0121 12c0 3-4 7-9 7a9.97 9.97 0 01-7.07-2.93M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth="2" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Must be at least 8 characters with a letter and number
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirm"
                    name="confirm"
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none transition-colors"
                    onClick={() => setShowConfirm((v) => !v)}
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  >
                    {showConfirm ? (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9-4-9-7s4-7 9-7c1.13 0 2.21.19 3.22.54M19.07 4.93A9.97 9.97 0 0121 12c0 3-4 7-9 7a9.97 9.97 0 01-7.07-2.93M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth="2" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <Button type="submit" variant="hero" className="w-full" disabled={isLoading}>
                {isLoading ? 'Changing Password...' : 'Change Password'}
              </Button>
            </form>

            <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
              <p className="font-medium mb-2">Password Requirements:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>At least 8 characters long</li>
                <li>Contains at least one letter (A-Z or a-z)</li>
                <li>Contains at least one number (0-9)</li>
                <li>Can include special characters</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PasswordChange;