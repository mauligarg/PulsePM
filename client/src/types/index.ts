export type Role = 'owner' | 'admin' | 'member' | 'guest';

export interface User {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  createdAt?: string;
}

export interface Workspace {
  _id: string;
  name: string;
  slug: string;
  ownerId: string;
  plan: 'free' | 'pro' | 'enterprise';
  role?: Role;
  isCurrent?: boolean;
  createdAt: string;
}

export interface Member {
  _id: string;
  userId: string;
  name: string;
  email: string;
  avatar?: string;
  role: Role;
  status: 'active' | 'invited' | 'removed';
  joinedAt: string;
}

export interface Project {
  _id: string;
  workspaceId: string;
  name: string;
  key: string;
  description: string;
  leadId?: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  status: 'active' | 'archived';
  taskCount?: number;
  doneCount?: number;
  progress?: number;
  createdAt: string;
}

export interface Sprint {
  _id: string;
  workspaceId: string;
  projectId: string;
  name: string;
  goal?: string;
  startDate?: string;
  endDate?: string;
  completedAt?: string;
  status: 'planned' | 'active' | 'completed';
  taskCount?: number;
  doneCount?: number;
  totalEstimate?: number;
  completedEstimate?: number;
  createdAt: string;
}

export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Attachment {
  _id: string;
  url: string;
  publicId?: string;
  filename: string;
  mimeType: string;
  size: number;
  uploadedBy?: string;
  uploadedAt: string;
}

export interface NotificationItem {
  _id: string;
  userId: string;
  actorId: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  taskId?: {
    _id: string;
    title: string;
    projectId?: string;
  };
  type: 'mention' | 'assignment' | 'invite';
  message: string;
  read: boolean;
  createdAt: string;
}

export interface Task {
  _id: string;
  workspaceId: string;
  projectId: string | { _id: string; name: string; key: string };
  sprintId?: string;
  title: string;
  description: string;
  assigneeId?: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  status: TaskStatus;
  priority: TaskPriority;
  labels: string[];
  order: number;
  parentTaskId?: string;
  dueDate?: string;
  estimateHours: number;
  attachments?: Attachment[];
  commentCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  _id: string;
  taskId: string;
  authorId: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  content: string;
  createdAt: string;
}

export interface TimeLog {
  _id: string;
  workspaceId: string;
  taskId: string | { _id: string; title: string; status: string };
  projectId: string | { _id: string; name: string; key: string };
  userId: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  hours: number;
  date: string;
  note: string;
  createdAt: string;
}

export interface TimesheetProjectRow {
  projectId: string;
  projectName: string;
  projectKey: string;
  days: Record<string, number>;
  total: number;
}

export interface TimesheetData {
  weekStart: string;
  weekEnd: string;
  days: string[];
  projects: TimesheetProjectRow[];
  dailyTotals: Record<string, number>;
  grandTotal: number;
  logs: TimeLog[];
}

export interface Activity {
  _id: string;
  actorId: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  entityType: 'project' | 'task' | 'comment' | 'workspace' | 'membership';
  entityId: string;
  action: string;
  meta: Record<string, any>;
  createdAt: string;
}

export interface DashboardSummary {
  statusCounts: {
    backlog: number;
    todo: number;
    in_progress: number;
    in_review: number;
    done: number;
    total: number;
  };
  priorityCounts: {
    low: number;
    medium: number;
    high: number;
    urgent: number;
  };
  overdueCount: number;
  overdueTasks: Task[];
  myOpenTasksCount: number;
  myOpenTasks: Task[];
  recentActivity: Activity[];
  projectCount: number;
  memberCount: number;
}
