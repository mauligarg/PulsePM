import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Building2, CheckCircle2, AlertCircle, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { invitesApi } from '../api/invites';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../components/common/Toast';

export const AcceptInvite: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { user, initAuth } = useAuthStore();
  const { toast } = useToast();

  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('No invitation token provided in URL.');
      setIsLoading(false);
      return;
    }

    invitesApi
      .getDetails(token)
      .then((res) => {
        setDetails(res.data);
      })
      .catch((err) => {
        setError(err.message || 'Invalid or expired invitation token.');
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;

    try {
      setIsAccepting(true);
      const res = await invitesApi.accept(token);
      localStorage.setItem('token', res.data.token);
      toast(res.message);
      await initAuth();
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to accept invitation');
    } finally {
      setIsAccepting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 bg-gradient-to-br from-slate-100 via-white to-slate-100">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white shadow-lg shadow-brand-500/25 mb-3">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Workspace Invitation</h1>
          <p className="text-xs text-slate-500 mt-1">PulsePM Multi-Tenant Collaboration</p>
        </div>

        <div className="bg-white rounded-2xl p-8 border border-slate-200/80 shadow-xl shadow-slate-200/50">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
              <p className="text-xs text-slate-400">Verifying secure invitation token...</p>
            </div>
          ) : error ? (
            <div className="text-center py-6">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">Invitation Unavailable</h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-6">{error}</p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-xl text-xs font-bold"
              >
                <span>Return to Login</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <span className="text-xs text-slate-400 block mb-1">You have been invited to join</span>
                <h3 className="text-lg font-black text-slate-900">{details?.workspaceName}</h3>
                <span className="inline-block mt-2 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-brand-100 text-brand-700">
                  Role: {details?.role}
                </span>
                <div className="text-[11px] text-slate-500 mt-2">
                  Invited by: <strong>{details?.inviterName}</strong>
                </div>
              </div>

              {user ? (
                <div>
                  <p className="text-xs text-slate-500 text-center mb-4">
                    You are signed in as <strong>{user.email}</strong>.
                  </p>
                  <button
                    onClick={handleAccept}
                    disabled={isAccepting}
                    className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    {isAccepting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    <span>Accept & Enter Workspace</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500 text-center mb-2">
                    Please log in or create an account to accept this invitation.
                  </p>
                  <Link
                    to="/login"
                    className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2"
                  >
                    <span>Sign In to Accept</span>
                  </Link>
                  <Link
                    to="/register"
                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center"
                  >
                    <span>Create New Account</span>
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
