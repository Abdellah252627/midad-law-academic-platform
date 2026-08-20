ALTER TABLE `support_follow_ups` ADD `isRead` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `support_follow_ups` ADD `readAt` timestamp;