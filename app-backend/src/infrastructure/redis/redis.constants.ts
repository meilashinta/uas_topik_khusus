export const CACHE_KEYS = {
  DASHBOARD_SUMMARY: (role: string, userId: string) => `dashboard:summary:${role}:${userId}`,
  TICKET_OPEN_COUNT: 'ticket:open:count',
  TICKET_DETAIL: (id: string) => `ticket:${id}`,
  USER_PROFILE: (id: string) => `user:${id}`,
  RATE_LIMIT_LOGIN: (email: string) => `ratelimit:login:${email}`,
  SLA_OVERDUE_LIST: 'sla:overdue:list',
};
