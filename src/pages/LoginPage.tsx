import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { ArrowRight, Sparkles, CheckCircle2, AlertCircle, Shield, Briefcase, MailCheck, ArrowLeft, KeyRound } from 'lucide-react';
import { supabase } from '../lib/supabase';

const LoginPage = () => {
  const defaultCompany = import.meta.env.VITE_DEFAULT_COMPANY_NAME || 'BKM Industries Limited';
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loginMode, setLoginMode] = useState<'workflow' | 'attendance'>('workflow');
  
  useEffect(() => {
    localStorage.setItem('loginRedirectMode', loginMode);
  }, [loginMode]);
  
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [contactNo, setContactNo] = useState('');
  const [inviteInfo, setInviteInfo] = useState<{ role: string; designation?: string } | null>(null);
  const [isInvited, setIsInvited] = useState(false);
  const [notInvitedError, setNotInvitedError] = useState<string | null>(null);

  // Forgot Password States
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetCooldown, setResetCooldown] = useState(0);
  const [resetError, setResetError] = useState<string | null>(null);
  const [isSendingReset, setIsSendingReset] = useState(false);

  const { login, signup, isLoading, error, sendPasswordResetEmail } = useAuthStore();

  useEffect(() => {
    if (resetCooldown > 0) {
      const timer = setTimeout(() => setResetCooldown(resetCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resetCooldown]);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setResetError('Please enter your email address.');
      return;
    }
    try {
      setIsSendingReset(true);
      setResetError(null);
      await sendPasswordResetEmail(email.trim());
      setResetSent(true);
      setResetCooldown(60);
    } catch (err: any) {
      let msg = err?.message || 'Failed to send reset link. Please check the email address.';
      if (msg === '{}') {
        msg = 'Supabase failed to send the recovery email. Please check your Supabase SMTP/Email provider configuration in the Dashboard.';
      }
      setResetError(msg);
    } finally {
      setIsSendingReset(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get('email');
    const roleParam = params.get('role');
    const designationParam = params.get('designation');
    const companyParam = params.get('company');

    const handleInviteEmail = (targetEmail: string) => {
      setEmail(targetEmail);
      setIsInvited(true);
      setIsLogin(false);
      if (companyParam) setCompanyName(companyParam);
      if (roleParam) setInviteInfo({ role: roleParam, designation: designationParam || undefined });

      supabase
        .from('pending_invites')
        .select('*, workspace:workspaces(name)')
        .eq('email', targetEmail.trim().toLowerCase())
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setInviteInfo({ role: data.role, designation: data.designation });
            if (data.workspace?.name) setCompanyName(data.workspace.name);
          }
        });
    };

    if (emailParam) {
      handleInviteEmail(emailParam);
    } else {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user?.email) {
          handleInviteEmail(session.user.email);
        }
      });
    }
  }, []);

  // Real-time lookup whenever user types their email on Signup page
  useEffect(() => {
    if (!isLogin && email && email.includes('@') && email.includes('.')) {
      const timer = setTimeout(async () => {
        const targetEmail = email.trim().toLowerCase();
        
        // 1. Check if account already exists
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', targetEmail)
          .maybeSingle();

        if (existingUser) {
          setIsInvited(false);
          setInviteInfo(null);
          setNotInvitedError('This account already exists. Please switch to Login.');
          useAuthStore.setState({ error: 'This account already exists. Please switch to Login.' });
          return;
        }

        // 2. Check pending invites
        supabase
          .from('pending_invites')
          .select('*, workspace:workspaces(name)')
          .eq('email', targetEmail)
          .maybeSingle()
          .then(({ data }) => {
            if (data) {
              setIsInvited(true);
              setNotInvitedError(null);
              useAuthStore.setState({ error: null });
              setInviteInfo({ role: data.role, designation: data.designation });
              if (data.workspace?.name) setCompanyName(data.workspace.name);
            } else {
              setIsInvited(false);
              setInviteInfo(null);
              const errMsg = 'You are not invited to join any workspace. Sign up is restricted to invited team members only.';
              setNotInvitedError(errMsg);
              useAuthStore.setState({ error: errMsg });
            }
          });
      }, 500); // 500ms debounce
      return () => clearTimeout(timer);
    } else {
      setNotInvitedError(null);
      if (!isLogin) useAuthStore.setState({ error: null });
    }
  }, [email, isLogin]);

  const isStrongPassword = (pass: string) => {
    const hasUpperCase = /[A-Z]/.test(pass);
    const hasLowerCase = /[a-z]/.test(pass);
    const hasNumbers = /\d/.test(pass);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(pass);
    const isLongEnough = pass.length >= 8;
    return hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar && isLongEnough;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password) {
      if (isLogin) {
        await login(email, password);
      } else {
        if (!isInvited) {
          useAuthStore.setState({ error: notInvitedError || 'You are not invited to join any workspace.' });
          return;
        }
        if (!isStrongPassword(password)) {
          useAuthStore.setState({ error: 'Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special character.' });
          return;
        }
        if (password !== confirmPassword) {
          useAuthStore.setState({ error: 'Passwords do not match.' });
          return;
        }
        if (!name.trim()) {
          useAuthStore.setState({ error: 'Name is required.' });
          return;
        }
        await signup(email, password, {
          name,
          company_name: companyName,
          contact_no: contactNo
        });
      }
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
            B
          </div>
          <span className="text-xl font-bold tracking-tight">{defaultCompany}</span>
        </div>

        <div className="z-10 max-w-md">
          <h1 className="text-4xl md:text-5xl font-bold leading-[1.15] mb-6">
            The intelligent way to manage your entire workflow.
          </h1>
          <div className="space-y-4">
            {[
              "Real-time team collaboration and messaging",
              "Advanced task management and sprint planning",
              "Dynamic workspaces and integrated calendar",
            ].map((feature, i) => (
              <div key={i} className="flex items-start space-x-3 text-gray-300">
                <CheckCircle2 size={20} className="text-brand shrink-0 mt-0.5" />
                <span className="text-[15px]">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="z-10 flex items-center space-x-4 text-sm text-gray-500">
          <span>© 2026 {defaultCompany}</span>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-12 md:px-24 lg:px-32 relative">
        {/* Mobile Header */}
        <div className="lg:hidden absolute top-8 left-8 flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#059669] to-[#10B981] flex items-center justify-center font-bold text-white shadow-md">
            B
          </div>
          <span className="text-lg font-bold tracking-tight text-gray-900">{defaultCompany}</span>
        </div>

        <div className="w-full max-w-md mx-auto">
          <div className="mb-10 text-left">
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">
              {isForgotPassword 
                ? 'Reset Password' 
                : isLogin 
                  ? 'Welcome back' 
                  : 'Create an account'}
            </h2>
            <p className="mt-3 text-[15px] text-gray-500">
              {isForgotPassword
                ? "Enter your registered email and we'll send you a link to reset your password."
                : isLogin 
                  ? 'Enter your details to sign in to your workspace.' 
                  : 'Sign up to create your first workspace.'}
            </p>
          </div>

          {inviteInfo && !isLogin && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200/60 rounded-xl flex items-center space-x-3 text-emerald-900 shadow-sm">
              <CheckCircle2 size={20} className="shrink-0 text-emerald-600" />
              <div className="text-sm">
                <p className="font-semibold">Workspace Invitation Found!</p>
                <p className="text-emerald-700 text-xs mt-0.5">
                  Assigned Role: <span className="font-bold capitalize">{inviteInfo.role}</span> {inviteInfo.designation ? `• Designation: ${inviteInfo.designation}` : ''}
                </p>
              </div>
            </div>
          )}

          {notInvitedError && !isLogin && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start space-x-3 text-amber-800 shadow-sm">
              <AlertCircle size={20} className="shrink-0 mt-0.5 text-amber-600" />
              <div>
                <p className="font-semibold text-sm">Invitation Required</p>
                <p className="text-xs text-amber-700 mt-0.5">{notInvitedError}</p>
              </div>
            </div>
          )}

          {error && !isForgotPassword && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start space-x-3 text-red-600">
              <AlertCircle size={20} className="shrink-0 mt-0.5" />
              <p className="text-sm">{typeof error === 'string' ? error : (error as any)?.message || 'Authentication error'}</p>
            </div>
          )}

          {isForgotPassword ? (
            resetSent ? (
              /* State: Email Sent Confirmation */
              <div className="text-center py-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="w-14 h-14 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-center mx-auto mb-5 text-emerald-600 shadow-sm">
                  <MailCheck size={28} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Check your inbox</h3>
                <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                  We've sent a password reset link to <strong className="text-gray-900 font-semibold">{email}</strong>. Click the link in the email to set a new password.
                </p>

                <div className="space-y-3">
                  <button
                    type="button"
                    disabled={resetCooldown > 0 || isSendingReset}
                    onClick={handleForgotPassword}
                    className="w-full py-2.5 px-4 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isSendingReset ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin"></div>
                        Sending...
                      </span>
                    ) : resetCooldown > 0 ? (
                      `Resend link in ${resetCooldown}s`
                    ) : (
                      'Resend email link'
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(false);
                      setResetSent(false);
                      setResetError(null);
                      useAuthStore.setState({ error: null });
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
                  >
                    <ArrowLeft size={16} />
                    Back to sign in
                  </button>
                </div>
              </div>
            ) : (
              /* State: Enter Email for Password Reset */
              <form className="space-y-5 animate-in fade-in duration-200" onSubmit={handleForgotPassword}>
                {resetError && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start space-x-3 text-red-600">
                    <AlertCircle size={20} className="shrink-0 mt-0.5" />
                    <p className="text-sm">{resetError}</p>
                  </div>
                )}

                <div>
                  <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Email address
                  </label>
                  <input
                    id="reset-email"
                    name="email"
                    type="email"
                    required
                    className="appearance-none block w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all sm:text-sm bg-gray-50/50 focus:bg-white"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={isSendingReset}
                    className="group relative w-full flex justify-center items-center py-3 px-4 border border-transparent text-[15px] font-semibold rounded-xl text-white bg-gray-900 hover:bg-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isSendingReset ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        Send Reset Link
                        <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </div>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(false);
                      setResetError(null);
                      useAuthStore.setState({ error: null });
                    }}
                    className="text-sm font-semibold text-gray-500 hover:text-gray-900 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ArrowLeft size={16} />
                    Back to sign in
                  </button>
                </div>
              </form>
            )
          ) : (
            <form className="space-y-5" onSubmit={handleSubmit}>
            {isLogin && (
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Select Login Mode
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setLoginMode('workflow')}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                      loginMode === 'workflow'
                        ? 'border-brand bg-brand/5 text-brand shadow-sm ring-1 ring-brand font-semibold'
                        : 'border-gray-200 hover:bg-gray-50 text-gray-500 font-medium'
                    }`}
                  >
                    <Briefcase size={18} className={loginMode === 'workflow' ? 'text-brand' : 'text-gray-400'} />
                    <span className="text-xs mt-1.5">Workflow Mode</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLoginMode('attendance')}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                      loginMode === 'attendance'
                        ? 'border-[#7e22ce] bg-[#7e22ce]/5 text-[#7e22ce] shadow-sm ring-1 ring-[#7e22ce] font-semibold'
                        : 'border-gray-200 hover:bg-gray-50 text-gray-500 font-medium'
                    }`}
                  >
                    <Shield size={18} className={loginMode === 'attendance' ? 'text-[#7e22ce]' : 'text-gray-400'} />
                    <span className="text-xs mt-1.5">Attendance Mode</span>
                  </button>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email-address" className="block text-sm font-medium text-gray-700 mb-1.5">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                required
                readOnly={isInvited}
                className={`appearance-none block w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all sm:text-sm ${isInvited ? 'bg-gray-100 text-gray-500 cursor-not-allowed select-none border-gray-200 font-medium' : 'bg-gray-50/50 focus:bg-white'}`}
                placeholder="name@company.com"
                value={email}
                onChange={(e) => !isInvited && setEmail(e.target.value)}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                {isLogin && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(true);
                      setResetSent(false);
                      setResetError(null);
                      useAuthStore.setState({ error: null });
                    }}
                    className="text-xs font-semibold text-brand hover:text-brand/80 transition-colors cursor-pointer"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none block w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all sm:text-sm bg-gray-50/50 focus:bg-white"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {!isLogin && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                    <input
                      id="name" type="text" required={!isLogin}
                      className="appearance-none block w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all sm:text-sm bg-gray-50/50 focus:bg-white"
                      placeholder="Jane Doe"
                      value={name} onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1.5">
                      {isInvited ? 'Invited Workspace' : 'Company Name'}
                    </label>
                    <input
                      id="company" type="text"
                      readOnly={isInvited}
                      className={`appearance-none block w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all sm:text-sm ${isInvited ? 'bg-gray-100 text-gray-500 cursor-not-allowed select-none border-gray-200 font-medium' : 'bg-gray-50/50 focus:bg-white'}`}
                      placeholder="Acme Corp"
                      value={companyName} onChange={(e) => !isInvited && setCompanyName(e.target.value)}
                    />
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Role</label>
                    <input
                      type="text"
                      readOnly={isInvited}
                      className={`appearance-none block w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all sm:text-sm capitalize ${isInvited ? 'bg-gray-100 text-gray-500 cursor-not-allowed select-none font-medium' : 'bg-gray-50/50 focus:bg-white'}`}
                      value={inviteInfo?.role || 'Member'}
                    />
                  </div>
                  <div className="col-span-2">
                    <label htmlFor="contact" className="block text-sm font-medium text-gray-700 mb-1.5">Contact Number</label>
                    <input
                      id="contact" type="tel"
                      className="appearance-none block w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all sm:text-sm bg-gray-50/50 focus:bg-white"
                      placeholder="+1 (555) 000-0000"
                      value={contactNo} onChange={(e) => setContactNo(e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}

            {!isLogin && (
              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Confirm Password
                </label>
                <input
                  id="confirm-password"
                  name="confirmPassword"
                  type="password"
                  required={!isLogin}
                  className="appearance-none block w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all sm:text-sm bg-gray-50/50 focus:bg-white"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center items-center py-3 px-4 border border-transparent text-[15px] font-semibold rounded-xl text-white bg-gray-900 hover:bg-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    {isLogin ? 'Sign In' : 'Create Account'}
                    <ArrowRight size={18} className="ml-2 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

          {!isForgotPassword && (
            <div className="mt-8 text-center text-sm">
              <span className="text-gray-500">
                {isLogin ? "Don't have an account? " : "Already have an account? "}
              </span>
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  useAuthStore.setState({ error: null });
                  setConfirmPassword('');
                  setName('');
                  if (!isInvited) setCompanyName('');
                  setContactNo('');
                }}
                className="font-semibold text-brand hover:text-brand/80 transition-colors cursor-pointer"
                type="button"
              >
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </div>
          )}

          <div className="mt-6 text-center text-xs font-mono text-gray-400 tracking-wider">
            Version XE 10.0
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
