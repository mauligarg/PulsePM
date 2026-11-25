import React, { useState, useEffect } from 'react';
import { ShieldAlert, Filter, Loader2, History } from 'lucide-react';
import { Activity, Member } from '../types';
import { apiClient } from '../api/client';
import { workspaceApi } from '../api/workspaces';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../components/common/Toast';

export const AuditLog: React.FC = () => {
  const { activeWorkspace, role } = useAuthStore();
  const { toast } = useToast();

  const [activities, setActivities] = useState<Activity[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [actorId, setActorId] = useState('');
  const [entityType, setEntityType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const isAuthorized = role === 'owner' || role === 'admin';

  const fetchAudit = async () => {
    if (!isAuthorized) return;
    try {
      setIsLoading(true);
      const res = (await apiClient.get('/activity/audit', {
        params: {
          limit: 50,
          actorId: actorId || undefined,
          entityType: entityType || undefined,
          from: from || undefined,
          to: to || undefined,
        },
      })) as any;
      setActivities(res.data?.activities || []);
    } catch (err: any) {
      toast(err.message || 'Failed to load audit log', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeWorkspace?._id && isAuthorized) {
      workspaceApi.getMembers(activeWorkspace._id).then((res) => setMembers(res.data));
      fetchAudit();
    }
  }, [activeWorkspace?._id, actorId, entityType, from, to, isAuthorized]);

  if (!isAuthorized) {
    return (
      <div className="h-72 flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-200 p-8 text-center">
        <ShieldAlert className="w-10 h-10 text-rose-500 mb-3" />
        <h3 className="text-sm font-bold text-slate-900">Restricted Access</h3>
        <p className="text-xs text-slate-500 mt-1">
          Only workspace Owners and Admins can view the compliance Audit Log.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 animate-in fade-in max-w-6xl">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <History className="w-5 h-5 text-brand-600" />
          <span>Workspace Audit Log</span>
        </h1>
        <p className="text-xs text-slate-500">
          Immutable, append-only compliance trail of all mutations and field-level diffs in {activeWorkspace?.name}
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mr-1">
          <Filter className="w-3.5 h-3.5" />
          <span>Filters:</span>
        </div>

        <select
          value={actorId}
          onChange={(e) => setActorId(e.target.value)}
          className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5"
        >
          <option value="">All Actors</option>
          {members.map((m) => (
            <option key={m.userId} value={m.userId}>
              {m.name} ({m.role})
            </option>
          ))}
        </select>

        <select
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
          className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5"
        >
          <option value="">All Entities</option>
          <option value="workspace">Workspace</option>
          <option value="membership">Membership</option>
          <option value="project">Project</option>
          <option value="sprint">Sprint</option>
          <option value="task">Task</option>
          <option value="comment">Comment</option>
          <option value="timelog">Time Log</option>
          <option value="attachment">Attachment</option>
        </select>

        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5"
          title="From date"
        />
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5"
          title="To date"
        />

        {(actorId || entityType || from || to) && (
          <button
            onClick={() => {
              setActorId('');
              setEntityType('');
              setFrom('');
              setTo('');
            }}
            className="text-xs font-semibold text-brand-600 hover:underline ml-auto"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Audit Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="h-48 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-brand-600 animate-spin" />
          </div>
        ) : activities.length === 0 ? (
          <p className="py-12 text-center text-xs text-slate-400 italic">
            No audit events match the selected filters.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {activities.map((a) => (
              <div key={a._id} className="p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-900">{a.actorId?.name || 'System'}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                      {a.entityType}
                    </span>
                    <span className="font-semibold text-brand-700">{a.action}</span>
                    {a.meta?.title && <span className="text-slate-600">"{a.meta.title}"</span>}
                    {a.meta?.name && <span className="text-slate-600">"{a.meta.name}"</span>}
                  </div>

                  {Array.isArray(a.meta?.diffs) && a.meta.diffs.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {a.meta.diffs.map((d: any, idx: number) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-[11px]"
                        >
                          <strong className="text-slate-700">{d.field}:</strong>
                          <span className="line-through text-rose-500">{String(d.from ?? 'none')}</span>
                          <span>→</span>
                          <span className="text-emerald-700 font-semibold">{String(d.to ?? 'none')}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <span className="text-[11px] text-slate-400 shrink-0">
                  {new Date(a.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
