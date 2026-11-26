import React, { useState, useEffect } from 'react';
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Trash2,
  Edit2,
  Check,
  X,
  Loader2,
} from 'lucide-react';
import { TimesheetData, Member } from '../types';
import { timeLogApi } from '../services/timelogs';
import { workspaceApi } from '../services/workspaces';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../components/common/Toast';

export const Timesheet: React.FC = () => {
  const { activeWorkspace, user, role } = useAuthStore();
  const { toast } = useToast();

  const [weekRef, setWeekRef] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [members, setMembers] = useState<Member[]>([]);
  const [data, setData] = useState<TimesheetData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editHours, setEditHours] = useState('');
  const [editNote, setEditNote] = useState('');

  const canViewOthers = role === 'owner' || role === 'admin';

  const fetchTimesheet = async () => {
    try {
      setIsLoading(true);
      const res = await timeLogApi.getTimesheet({
        weekStart: weekRef,
        userId: selectedUserId || undefined,
      });
      setData(res.data);
    } catch (err: any) {
      toast(err.message || 'Failed to load timesheet', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeWorkspace?._id) {
      fetchTimesheet();
      if (canViewOthers) {
        workspaceApi.getMembers(activeWorkspace._id).then((res) => setMembers(res.data));
      }
    }
  }, [activeWorkspace?._id, weekRef, selectedUserId]);

  const shiftWeek = (daysDelta: number) => {
    const d = new Date(weekRef);
    d.setUTCDate(d.getUTCDate() + daysDelta);
    setWeekRef(d.toISOString().split('T')[0]);
  };

  const handleSaveEdit = async (id: string) => {
    try {
      await timeLogApi.update(id, { hours: Number(editHours), note: editNote });
      toast('Time log updated');
      setEditingId(null);
      fetchTimesheet();
    } catch (err: any) {
      toast(err.message || 'Failed to update log', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this time log entry?')) return;
    try {
      await timeLogApi.delete(id);
      toast('Time log deleted');
      fetchTimesheet();
    } catch (err: any) {
      toast(err.message || 'Failed to delete log', 'error');
    }
  };

  const formatDayHeader = (iso: string) => {
    const d = new Date(`${iso}T00:00:00Z`);
    return {
      weekday: d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }),
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
    };
  };

  return (
    <div className="space-y-5 sm:space-y-6 pb-12 animate-in fade-in max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-fluid-page-title font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Clock className="w-5 h-5 text-brand-600 shrink-0" />
            <span>Weekly Timesheet</span>
          </h1>
          <p className="text-xs text-slate-500">
            Track logged hours per project and day across {activeWorkspace?.name}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-3">
          {canViewOthers && members.length > 0 && (
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full sm:w-auto text-xs font-medium bg-white border border-slate-200 rounded-xl px-3 py-2"
            >
              <option value="">My Timesheet ({user?.name})</option>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.name} ({m.role})
                </option>
              ))}
            </select>
          )}

          <div className="flex items-center justify-between sm:justify-start bg-white border border-slate-200 rounded-xl p-1 gap-1">
            <button
              onClick={() => shiftWeek(-7)}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600"
              title="Previous Week"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold text-slate-700 px-2 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              {data ? `${data.weekStart} → ${data.weekEnd}` : weekRef}
            </span>
            <button
              onClick={() => shiftWeek(7)}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600"
              title="Next Week"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {isLoading || !data ? (
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="w-7 h-7 text-brand-600 animate-spin" />
        </div>
      ) : (
        <>
          {/* Week Grid Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500">
                    <th className="py-3 px-4 font-bold uppercase text-[10px] tracking-wider">Project</th>
                    {data.days.map((d) => {
                      const { weekday, date } = formatDayHeader(d);
                      return (
                        <th key={d} className="py-3 px-3 text-center">
                          <div className="text-[10px] font-bold uppercase text-slate-400">{weekday}</div>
                          <div className="text-xs font-semibold text-slate-700">{date}</div>
                        </th>
                      );
                    })}
                    <th className="py-3 px-4 text-right font-bold uppercase text-[10px] tracking-wider">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.projects.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-10 text-center text-slate-400 italic">
                        No time logged for this week. Open any task on the Board to log hours.
                      </td>
                    </tr>
                  ) : (
                    data.projects.map((proj) => (
                      <tr key={proj.projectId} className="hover:bg-slate-50/60">
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-brand-50 text-brand-700 mr-2">
                            {proj.projectKey}
                          </span>
                          {proj.projectName}
                        </td>
                        {data.days.map((d) => (
                          <td key={d} className="py-3 px-3 text-center">
                            {proj.days[d] > 0 ? (
                              <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-semibold">
                                {proj.days[d]}h
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        ))}
                        <td className="py-3 px-4 text-right font-bold text-slate-900">{proj.total}h</td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 border-t border-slate-200 font-bold text-slate-800">
                    <td className="py-3 px-4">Daily Totals</td>
                    {data.days.map((d) => (
                      <td key={d} className="py-3 px-3 text-center">
                        {data.dailyTotals[d] > 0 ? `${data.dailyTotals[d]}h` : '0h'}
                      </td>
                    ))}
                    <td className="py-3 px-4 text-right text-brand-700 text-sm">{data.grandTotal}h</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Detailed Entries */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Time Entries ({data.logs.length})</h3>
            {data.logs.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No entries recorded in this period.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {data.logs.map((log) => {
                  const isEditing = editingId === log._id;
                  const canEdit =
                    role === 'owner' ||
                    role === 'admin' ||
                    (role === 'member' && (!selectedUserId || selectedUserId === user?._id));
                  const taskObj = typeof log.taskId === 'object' && log.taskId ? log.taskId : null;
                  const projObj = typeof log.projectId === 'object' && log.projectId ? log.projectId : null;

                  return (
                    <div key={log._id} className="py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                            {projObj?.key || 'PRJ'}
                          </span>
                          <span className="font-semibold text-slate-900 truncate">
                            {taskObj?.title || 'Task'}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            · {new Date(log.date).toLocaleDateString()}
                          </span>
                        </div>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editNote}
                            onChange={(e) => setEditNote(e.target.value)}
                            className="mt-1.5 w-full max-w-md px-2.5 py-1 text-xs border border-slate-200 rounded-lg"
                            placeholder="Work note..."
                          />
                        ) : (
                          log.note && <p className="text-slate-500 mt-0.5">{log.note}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isEditing ? (
                          <>
                            <input
                              type="number"
                              step="0.25"
                              min="0.1"
                              max="24"
                              value={editHours}
                              onChange={(e) => setEditHours(e.target.value)}
                              className="w-20 px-2 py-1 text-xs border border-slate-200 rounded-lg"
                            />
                            <button
                              onClick={() => handleSaveEdit(log._id)}
                              className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
                              {log.hours}h
                            </span>
                            {canEdit && (
                              <>
                                <button
                                  onClick={() => {
                                    setEditingId(log._id);
                                    setEditHours(String(log.hours));
                                    setEditNote(log.note || '');
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDelete(log._id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
