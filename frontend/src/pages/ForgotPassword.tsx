import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Loader2, ArrowLeft, MailCheck, Send } from 'lucide-react';
import { authApi } from '../services/auth';
import { useToast } from '../components/common/Toast';

export const ForgotPassword: React.FC = () => {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  const isValidEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!isValidEmail(trimmed)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    setEmailError(null);
    setIsSubmitting(true);
    try {
      const res = await authApi.forgotPassword(trimmed);
      setSubmittedMessage(
        res.message ||
          'If an account exists with this email, you will receive a password reset link shortly.'
      );
    } catch (err: any) {
      toast(err.message || 'Unable to process request right now', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-dvh w-full flex items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-slate-100 via-white to-slate-100">
      <div className="max-w-md w-full">
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white shadow-lg shadow-brand-500/25 mb-3">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="text-fluid-page-title font-black text-slate-900 tracking-tight">
            Forgot Password
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            We&apos;ll send a secure reset link to your registered email
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 sm:p-8 border border-slate-200/80 shadow-xl shadow-slate-200/50">
          {submittedMessage ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <MailCheck className="w-6 h-6" />
              </div>
              <h2 className="text-base font-bold text-slate-900">Check your inbox</h2>
              <p className="text-xs text-slate-600 leading-relaxed">{submittedMessage}</p>
              <div className="pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-2 w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/25 transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Sign In</span>
                </Link>
              </div>
            </div>
          ) : (
            <>
              <h2 className="text-base font-bold text-slate-900 mb-1">Reset your password</h2>
              <p className="text-xs text-slate-500 mb-6">
                Enter your registered email address and we&apos;ll send you a one-time reset link.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="forgot-email" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Email Address
                  </label>
                  <input
                    id="forgot-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError(null);
                    }}
                    placeholder="name@company.com"
                    autoComplete="email"
                    className={`w-full px-3.5 py-2.5 text-xs bg-slate-50 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 transition-all ${
                      emailError
                        ? 'border-rose-300 focus:ring-rose-500/20 focus:border-rose-500'
                        : 'border-slate-200 focus:ring-brand-500/20 focus:border-brand-500'
                    }`}
                  />
                  {emailError && <p className="mt-1.5 text-[11px] font-medium text-rose-600">{emailError}</p>}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !email.trim()}
                  className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>Send Reset Link</span>
                </button>
              </form>

              <div className="mt-6 text-center text-xs text-slate-500">
                Remember your password?{' '}
                <Link to="/login" className="font-semibold text-brand-600 hover:underline">
                  Sign in
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
