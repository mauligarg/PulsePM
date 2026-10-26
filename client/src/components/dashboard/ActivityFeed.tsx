import React from 'react';
import { Activity } from '../../types';
import {
  FolderKanban,
  CheckSquare,
  MessageSquare,
  Building2,
  Users,
  Clock,
} from 'lucide-react';

interface ActivityFeedProps {
  activities: Activity[];
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({ activities }) => {
  const getIcon = (type: string) => {
    switch (type) {
      case 'project':
        return <FolderKanban className="w-3.5 h-3.5 text-blue-500" />;
      case 'task':
        return <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />;
      case 'comment':
        return <MessageSquare className="w-3.5 h-3.5 text-purple-500" />;
      case 'workspace':
        return <Building2 className="w-3.5 h-3.5 text-amber-500" />;
      case 'membership':
        return <Users className="w-3.5 h-3.5 text-indigo-500" />;
      default:
        return <Clock className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const formatAction = (activity: Activity) => {
    const actor = activity.actorId?.name || 'Someone';
    const action = activity.action;
    const meta = activity.meta || {};

    switch (activity.entityType) {
      case 'task':
        if (action === 'moved') {
          return (
            <span>
              <strong>{actor}</strong> moved task{' '}
              <span className="font-semibold text-slate-900">"{meta.title}"</span> to{' '}
              <span className="capitalize font-semibold text-brand-600">
                {meta.toStatus?.replace('_', ' ')}
              </span>
            </span>
          );
        }
        return (
          <span>
            <strong>{actor}</strong> {action} task{' '}
            <span className="font-semibold text-slate-900">"{meta.title}"</span>
          </span>
        );
      case 'comment':
        return (
          <span>
            <strong>{actor}</strong> commented on{' '}
            <span className="font-semibold text-slate-900">"{meta.taskTitle}"</span>
          </span>
        );
      case 'project':
        return (
          <span>
            <strong>{actor}</strong> {action} project{' '}
            <span className="font-semibold text-slate-900">"{meta.name}"</span>
          </span>
        );
      case 'membership':
        if (action === 'invited') {
          return (
            <span>
              <strong>{actor}</strong> invited{' '}
              <span className="font-semibold text-slate-900">{meta.email}</span> as{' '}
              <span className="capitalize">{meta.role}</span>
            </span>
          );
        }
        if (action === 'joined') {
          return (
            <span>
              <strong>{actor}</strong> joined the workspace as{' '}
              <span className="capitalize">{meta.role}</span>
            </span>
          );
        }
        return (
          <span>
            <strong>{actor}</strong> {action} workspace membership
          </span>
        );
      default:
        return (
          <span>
            <strong>{actor}</strong> performed {action} on {activity.entityType}
          </span>
        );
    }
  };

  const getRelativeTime = (dateStr: string) => {
    const diff = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[380px]">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-slate-900">Live Workspace Activity</h3>
        <p className="text-xs text-slate-400">Audit trail of real-time tenant events</p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
        {activities.length === 0 ? (
          <p className="text-xs text-slate-400 italic text-center py-12">No activity recorded yet.</p>
        ) : (
          activities.map((act) => (
            <div key={act._id} className="flex items-start gap-3 text-xs">
              <div className="relative shrink-0">
                <img
                  src={
                    act.actorId?.avatar ||
                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${
                      act.actorId?.name || 'User'
                    }`
                  }
                  alt={act.actorId?.name}
                  className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 object-cover"
                />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-xs">
                  {getIcon(act.entityType)}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-slate-700 leading-snug">{formatAction(act)}</p>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  {getRelativeTime(act.createdAt)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
