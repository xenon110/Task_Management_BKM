import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  ShieldCheck, 
  KeyRound, 
  Sparkles,
  ArrowLeft
} from 'lucide-react';

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const defaultCompany = import.meta.env.VITE_DEFAULT_COMPANY_NAME || 'BKM Industries Limited';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [error, setError] = useState<string | null>(null);

  // Link/session validity state
  const [isCheckingToken, setIsCheckingToken] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState(false);

  // Check URL errors or existing recovery session on mount
  useEffect(() => {
    const checkRecoverySession = async () => {
      // 1. Check if Supabase redirected with an error in hash or query params
      const hash = window.location.hash;
      const search = window.location.search;
      const params = new URLSearchParams(hash.replace(/^#/, '') || search);
      
      const errorDescription = params.get('error_description');
      if (errorDescription) {
        setError(decodeURIComponent(errorDescription.replace(/\+/g, ' ')));
        setIsTokenValid(false);
        setIsCheckingToken(false);
        return;
      }

      // 2. Check if recovery token/code is directly in the URL
      if (hash.includes('access_token') || hash.includes('type=recovery') || search.includes('code=')) {
        setIsTokenValid(true);
        setIsCheckingToken(false);
        return;
      }

      // 3. Check if a session already exists (e.g. exchanged via magic link / PKCE)
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsTokenValid(true);
        setIsCheckingToken(false);
        return;
      }

      // 3. Listen to auth state change for PASSWORD_RECOVERY event
      const { data: authListener } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
        if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && currentSession)) {
          setIsTokenValid(true);
          setIsCheckingToken(false);
        }
      });

      // Fallback timeout in case no token is present in URL
      const timeout = setTimeout(() => {
        setIsCheckingToken(false);
      }, 1500);

      return () => {
        authListener.subscription.unsubscribe();
        clearTimeout(timeout);
      };
    };

    checkRecoverySession();
  }, []);

  // Countdown timer on success redirect
  useEffect(() => {
    if (isSuccess && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (isSuccess && countdown === 0) {
      navigate('/login');
    }
  }, [isSuccess, countdown, navigate]);

  // Validation criteria
  const hasMinLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  // Strength score: 0 to 5
  const strengthScore = [hasMinLength, hasUpperCase, hasLowerCase, hasNumber, hasSpecialChar].filter(Boolean).length;

  const getStrengthMeta = () => {
    if (password.length === 0) return { label: 'None', color: 'bg-gray-200', text: 'text-gray-400' };
    if (strengthScore <= 2) return { label: 'Weak', color: 'bg-rose-500', text: 'text-rose-500' };
    if (strengthScore === 3 || strengthScore === 4) return { label: 'Moderate', color: 'bg-amber-500', text: 'text-amber-500' };
    return { label: 'Strong', color: 'bg-emerald-500', text: 'text-emerald-500' };
  };

  const strengthMeta = getStrengthMeta();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (strengthScore < 4) {
      setError('Please choose a stronger password meeting all requirements below.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify both fields.');
      return;
    }

    try {
      setIsSubmitting(true);
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) throw updateError;

      // Password updated successfully! Clear recovery session so they log in fresh
      await supabase.auth.signOut();
      setIsSuccess(true);
    } catch (err: any) {
      console.error('Password reset failed:', err);
      setError(err?.message || 'Failed to update password. Please try requesting a new reset link.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white font-sans text-gray-900 selection:bg-brand/20">
      {/* Left side - Dark premium visual */}
      <div className="hidden lg:flex lg:flex-1 flex-col justify-between bg-[#0A0A0A] text-white p-12 relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-brand/20 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/20 blur-[120px]"></div>

        <div className="z-10 flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#059669] to-[#10B981] flex items-center justify-center font-bold text-white shadow-lg text-lg">
            BK
          </div>
          <span className="text-xl font-bold tracking-tight text-white">{defaultCompany}</span>
        </div>

        <div className="z-10 max-w-lg mb-12">
          <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-xs font-medium text-emerald-400 mb-6">
            <ShieldCheck size={14} />
            <span>Secure Password Recovery</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight leading-tight mb-4">
            Protecting your workspace identity.
          </h1>
          <p className="text-gray-400 text-base leading-relaxed">
            Create a unique, robust password to keep your tasks, projects, and personal workspace data safe.
          </p>
        </div>

        <div className="z-10 text-xs text-gray-500 font-mono">
          Security Protocol • End-to-End Encrypted
        </div>
      </div>

      {/* Right side - Reset Password Card */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-20 py-12 relative">
        <div className="lg:hidden absolute top-8 left-8 flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#059669] to-[#10B981] flex items-center justify-center font-bold text-white text-sm">
            BK
          </div>
          <span className="text-lg font-bold tracking-tight text-gray-900">{defaultCompany}</span>
        </div>

        <div className="w-full max-w-md mx-auto">
          {/* State 1: Checking session */}
          {isCheckingToken && (
            <div className="text-center py-12">
              <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-sm font-medium text-gray-500">Verifying security token...</p>
            </div>
          )}

          {/* State 2: Success Confirmation */}
          {!isCheckingToken && isSuccess && (
            <div className="text-center animate-in fade-in zoom-in-95 duration-300">
              <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-center mx-auto mb-6 text-emerald-600 shadow-sm">
                <CheckCircle2 size={36} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight mb-2">
                Password Reset Successfully!
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                Your new password has been safely updated. You can now log into your workspace with your new credentials.
              </p>
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-xs text-gray-600 mb-6 flex items-center justify-center gap-2">
                <span>Redirecting you to login in</span>
                <span className="font-bold text-brand">{countdown}s</span>
              </div>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full flex justify-center items-center py-3 px-4 rounded-xl text-white bg-gray-900 hover:bg-black font-semibold text-sm transition-all shadow-md"
              >
                Go to Sign In Now
                <ArrowRight size={16} className="ml-2" />
              </button>
            </div>
          )}

          {/* State 3: Invalid or Expired Token */}
          {!isCheckingToken && !isSuccess && !isTokenValid && (
            <div className="text-center animate-in fade-in duration-200">
              <div className="w-16 h-16 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-center mx-auto mb-6 text-rose-500 shadow-sm">
                <AlertCircle size={36} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight mb-2">
                Invalid or Expired Link
              </h2>
              <p className="text-sm text-gray-500 mb-8 leading-relaxed">
                This password reset link is invalid, has expired, or has already been used. Please request a new link from the login page.
              </p>
              {error && (
                <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 text-left">
                  {error}
                </div>
              )}
              <Link
                to="/login"
                className="inline-flex justify-center items-center w-full py-3 px-4 rounded-xl text-white bg-gray-900 hover:bg-black font-semibold text-sm transition-all shadow-md"
              >
                <ArrowLeft size={16} className="mr-2" />
                Return to Sign In
              </Link>
            </div>
          )}

          {/* State 4: Valid Token - Enter New Password */}
          {!isCheckingToken && !isSuccess && isTokenValid && (
            <div>
              <div className="mb-8 text-left">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-brand flex items-center justify-center mb-4 border border-purple-100">
                  <KeyRound size={20} />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                  Set New Password
                </h2>
                <p className="mt-2 text-sm text-gray-500">
                  Please choose a strong, secure password for your account.
                </p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start space-x-3 text-red-600 animate-in fade-in duration-150">
                  <AlertCircle size={18} className="shrink-0 mt-0.5" />
                  <p className="text-sm leading-snug">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* New Password */}
                <div>
                  <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      id="new-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="appearance-none block w-full pl-4 pr-11 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all sm:text-sm bg-gray-50/50 focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  {/* Password Strength Meter */}
                  {password.length > 0 && (
                    <div className="mt-2.5 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Strength:</span>
                        <span className={`font-semibold ${strengthMeta.text}`}>{strengthMeta.label}</span>
                      </div>
                      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden flex gap-1">
                        <div className={`h-full flex-1 rounded-full transition-all duration-300 ${strengthScore >= 1 ? strengthMeta.color : 'bg-transparent'}`} />
                        <div className={`h-full flex-1 rounded-full transition-all duration-300 ${strengthScore >= 2 ? strengthMeta.color : 'bg-transparent'}`} />
                        <div className={`h-full flex-1 rounded-full transition-all duration-300 ${strengthScore >= 3 ? strengthMeta.color : 'bg-transparent'}`} />
                        <div className={`h-full flex-1 rounded-full transition-all duration-300 ${strengthScore >= 4 ? strengthMeta.color : 'bg-transparent'}`} />
                        <div className={`h-full flex-1 rounded-full transition-all duration-300 ${strengthScore >= 5 ? strengthMeta.color : 'bg-transparent'}`} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
                      Confirm New Password
                    </label>
                    {passwordsMatch && (
                      <span className="inline-flex items-center text-xs font-semibold text-emerald-600 gap-1">
                        <CheckCircle2 size={13} />
                        Matches
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      id="confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat your new password"
                      className={`appearance-none block w-full pl-4 pr-11 py-3 border rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all sm:text-sm bg-gray-50/50 focus:bg-white ${
                        confirmPassword.length > 0 && !passwordsMatch 
                          ? 'border-amber-300 focus:ring-amber-500' 
                          : 'border-gray-200'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Requirements Checklist */}
                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100 text-xs text-gray-600 space-y-1.5">
                  <p className="font-semibold text-gray-700 mb-1">Password must include:</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-600 font-medium' : 'text-gray-400'}`}>
                      <CheckCircle2 size={13} className={hasMinLength ? 'text-emerald-500' : 'text-gray-300'} />
                      <span>At least 8 chars</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${hasUpperCase ? 'text-emerald-600 font-medium' : 'text-gray-400'}`}>
                      <CheckCircle2 size={13} className={hasUpperCase ? 'text-emerald-500' : 'text-gray-300'} />
                      <span>1 uppercase letter</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${hasLowerCase ? 'text-emerald-600 font-medium' : 'text-gray-400'}`}>
                      <CheckCircle2 size={13} className={hasLowerCase ? 'text-emerald-500' : 'text-gray-300'} />
                      <span>1 lowercase letter</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${hasNumber && hasSpecialChar ? 'text-emerald-600 font-medium' : 'text-gray-400'}`}>
                      <CheckCircle2 size={13} className={hasNumber && hasSpecialChar ? 'text-emerald-500' : 'text-gray-300'} />
                      <span>1 number & symbol</span>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting || !passwordsMatch || strengthScore < 4}
                  className="w-full flex justify-center items-center py-3 px-4 rounded-xl text-white bg-gray-900 hover:bg-black font-semibold text-sm transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span>Update Password</span>
                      <ArrowRight size={16} className="ml-2" />
                    </>
                  )}
                </button>

                <div className="text-center pt-2">
                  <Link
                    to="/login"
                    className="text-xs font-semibold text-gray-500 hover:text-gray-800 transition-colors inline-flex items-center gap-1"
                  >
                    <ArrowLeft size={13} />
                    Back to Sign In
                  </Link>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
