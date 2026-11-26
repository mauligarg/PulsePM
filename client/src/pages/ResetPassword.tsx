import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Sparkles, Loader2, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { authApi } from '../api/auth';
import { PasswordInput } from '../components/auth/PasswordInput';
import { PasswordRequirements } from '../components/auth/PasswordRequirements';
import { evaluatePassword } from '../utils/password';

export const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [isVerifying, setIsVerifying] = useState(true);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const { isValid: isPasswordStrong } = evaluatePassword(password);
  const passwordsMatch = password === confirmPassword;
  const showMismatchError = confirmPassword.length > 0 && !passwordsMatch;
  const canSubmit =
    Boolean(token) &&
    isPasswordStrong &&
    confirmPassword.length > 0 &&
    passwordsMatch &&
    !isSubmitting;

  useEffect(() => {
    let active = true;
    const verify = async () => {
      if (!token) {
        if (active) {
          setTokenError('Password reset token is missing. Please request a new reset link.');
          setIsVerifying(false);
        }
        return;
      }

      try {
        await authApi.verifyResetToken(token);
      } catch (err: any) {
        if (active) {
          setTokenError(err.message || 'Password reset link is invalid or has expired.');
        }
      } finally {
        if (active) setIsVerifying(false);
      }
    };
    verify();
    return () => {
      active = false;
    };
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await authApi.resetPassword({ token, password });
      setIsSuccess(true);
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to reset password');
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
            Reset Password
          </h1>
          <p className="text-xs text-slate-500 mt-1">Choose a strong new password for your account</p>
        </div>

        <div className="bg-white rounded-2xl p-5 sm:p-8 border border-slate-200/80 shadow-xl shadow-slate-200/50">
          {isVerifying ? (
            <div className="py-10 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-7 h-7 text-brand-600 animate-spin" />
              <p className="text-xs text-slate-500">Verifying reset link...</p>
            </div>
          ) : tokenError ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h2 className="text-base font-bold text-slate-900">Link Invalid or Expired</h2>
              <p className="text-xs text-slate-500 leading-relaxed">{tokenError}</p>
              <Link
                to="/forgot-password"
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/25 transition-all"
              >
                <span>Request New Reset Link</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : isSuccess ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h2 className="text-base font-bold text-slate-900">Password Updated</h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Your password has been reset and existing sessions were invalidated. Sign in with your new password.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/25 transition-all"
              >
                <span>Go to Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {submitError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                  {submitError}
                </div>
              )}

              <div>
                <PasswordInput
                  id="reset-password"
                  label="New Password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a strong password"
                  autoComplete="new-password"
                />
                <PasswordRequirements password={password} />
              </div>

              <div>
                <PasswordInput
                  id="reset-confirm-password"
                  label="Confirm New Password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your new password"
                  autoComplete="new-password"
                  error={showMismatchError ? 'Passwords do not match' : undefined}
                />
                {confirmPassword.length > 0 && passwordsMatch && (
                  <p className="mt-1.5 text-[11px] font-medium text-emerald-600">Passwords match</p>
                )}
              </div>

              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                <span>Update Password</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
