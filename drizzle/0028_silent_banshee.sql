CREATE TABLE `forum_violation_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`sourceType` enum('topic','reply') NOT NULL,
	`sourceId` int,
	`category` varchar(40) NOT NULL DEFAULT 'blocked_word',
	`redactedExcerpt` varchar(220),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `forum_violation_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `forum_violation_events` ADD CONSTRAINT `forum_violation_events_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;