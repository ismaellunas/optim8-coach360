export const adminPaths = {
  login: '/admin/login',
  root: '/admin',
  users: '/admin/users',
  subscriptions: '/admin/subscriptions',
  content: '/admin/content',
  monitor: '/admin/monitor',
} as const;

export type AdminNavItem = {
  id: 'users' | 'subscriptions' | 'content' | 'monitor';
  label: 'Users' | 'Subscriptions' | 'Content' | 'Monitor';
  path: string;
};

export const adminNavItems: AdminNavItem[] = [
  { id: 'users', label: 'Users', path: adminPaths.users },
  { id: 'subscriptions', label: 'Subscriptions', path: adminPaths.subscriptions },
  { id: 'content', label: 'Content', path: adminPaths.content },
  { id: 'monitor', label: 'Monitor', path: adminPaths.monitor },
];
