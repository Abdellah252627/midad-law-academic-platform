export const ADMIN_NOTIFICATION_TYPES = [
  "purchase_request",
  "support_follow_up",
  "complaint",
] as const;

export type AdminNotificationType = (typeof ADMIN_NOTIFICATION_TYPES)[number];

export const ADMIN_NOTIFICATION_PRIORITIES = ["high", "critical"] as const;

export type AdminNotificationPriority = (typeof ADMIN_NOTIFICATION_PRIORITIES)[number];

export const ADMIN_NOTIFICATION_DEFINITIONS = {
  purchase_request: {
    label: "طلب شراء جديد",
    priority: "high",
    targetPath: "/admin/orders",
  },
  support_follow_up: {
    label: "طلب تواصل جديد",
    priority: "high",
    targetPath: "/admin/follow-ups",
  },
  complaint: {
    label: "شكوى جديدة",
    priority: "critical",
    targetPath: "/admin/complaints",
  },
} as const satisfies Record<
  AdminNotificationType,
  {
    label: string;
    priority: AdminNotificationPriority;
    targetPath: string;
  }
>;
