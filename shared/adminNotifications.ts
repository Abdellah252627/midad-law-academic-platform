export const ADMIN_NOTIFICATION_TYPES = [
  "purchase_request",
  "support_follow_up",
  "complaint",
] as const;

export type AdminNotificationType = (typeof ADMIN_NOTIFICATION_TYPES)[number];

export const ADMIN_NOTIFICATION_PRIORITIES = ["high", "critical"] as const;

export type AdminNotificationPriority = (typeof ADMIN_NOTIFICATION_PRIORITIES)[number];

export type AdminNotificationPayload = {
  type: AdminNotificationType;
  title: string;
  message: string;
  priority: AdminNotificationPriority;
  entityType: string;
  entityId: string;
  targetPath: string;
};

export function buildPurchaseRequestNotification(orderNumber: string, requestId: number): AdminNotificationPayload {
  const definition = ADMIN_NOTIFICATION_DEFINITIONS.purchase_request;
  return {
    type: "purchase_request",
    title: definition.label,
    message: `وصل طلب شراء جديد بالرقم ${orderNumber} ويحتاج إلى مراجعة.`,
    priority: definition.priority,
    entityType: "purchase_request",
    entityId: String(requestId),
    targetPath: "/admin/purchases",
  };
}

export function buildSupportFollowUpNotification(reference: string, followUpId: number): AdminNotificationPayload {
  const definition = ADMIN_NOTIFICATION_DEFINITIONS.support_follow_up;
  return {
    type: "support_follow_up",
    title: definition.label,
    message: `وصل طلب تواصل جديد بالمرجع ${reference} ويحتاج إلى متابعة.`,
    priority: definition.priority,
    entityType: "support_follow_up",
    entityId: String(followUpId),
    targetPath: definition.targetPath,
  };
}

export function buildComplaintNotification(ticketNumber: string, complaintId: number): AdminNotificationPayload {
  const definition = ADMIN_NOTIFICATION_DEFINITIONS.complaint;
  return {
    type: "complaint",
    title: definition.label,
    message: `وصلت شكوى جديدة بالرقم ${ticketNumber} وتحتاج إلى مراجعة.`,
    priority: definition.priority,
    entityType: "complaint",
    entityId: String(complaintId),
    targetPath: definition.targetPath,
  };
}

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
