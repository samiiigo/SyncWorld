// ──────────────────────────────────────────────
// notifications.events.ts — Notification event catalog
// SRP: notification type constants only
// OCP: add new notification types without modifying existing ones
// ──────────────────────────────────────────────

export const NOTIFICATION_TYPES = {
  VOTE_REQUESTED: 'vote_requested',
  ALARM_APPROACHING: 'alarm_approaching',
  ALARM_FIRED: 'alarm_fired',
  ROOM_STATUS_CHANGED: 'room_status_changed',
  MEMBER_JOINED: 'member_joined',
  MEMBER_LEFT: 'member_left',
  PROPOSAL_EXPIRED: 'proposal_expired',
  CONSENSUS_REACHED: 'consensus_reached',
} as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];

/**
 * Maps each notification type to a title/body template.
 * TODO: implement with i18n string interpolation
 */
export type NotificationTemplate = {
  type: NotificationType;
  titleTemplate: string;
  bodyTemplate: string;
};
