import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../components/common/Toast';

export const WorkspaceSelect: React.FC = () => {
  const { workspaces, switchWorkspace, createWorkspace, isLoading, user } = useAuthStore();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleSelect = async (wsId: string) => {
    await switchWorkspace(wsId);
    toast('Switched workspace');
    navigate('/dashboard');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setIsCreating(true);
      await createWorkspace(name.trim(), slug.trim());
      toast(`Workspace "${name}" created!`);
      navigate('/dashboard');
    } catch (err: any) {
      toast(err.message || 'Failed to create workspace', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 bg-gradient-to-br from-slate-100 via-white to-slate-100">
      <div className="max-w-lg w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white shadow-lg shadow-brand-500/25 mb-3">
            <Building2 className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Select or Create Workspace</h1>
          <p className="text-xs text-slate-500 mt-1">Hello {user?.name}, choose an organization to enter</p>
        </div>

        {/* Existing workspaces list */}
        {workspaces.length > 0 && (
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xl shadow-slate-200/50 mb-6">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Your Existing Workspaces
            </h2>
            <div className="space-y-2">
              {workspaces.map((ws) => (
                <button
                  key={ws._id}
                  onClick={() => handleSelect(ws._id)}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:border-brand-500 hover:bg-brand-50/30 transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs shrink-0">
                      {ws.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 group-hover:text-brand-600 transition-colors">
                        {ws.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">slug: {ws.slug}</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-brand-600 group-hover:translate-x-1 transition-all" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Create New Workspace */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xl shadow-slate-200/50">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Create a New Workspace
          </h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Workspace Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                }}
                placeholder="e.g. Stellar Dynamics"
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Workspace Slug</label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="stellar-dynamics"
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={isCreating || !name.trim()}
              className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span>Create Workspace</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
