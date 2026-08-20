CREATE TABLE `forum_user_moderation` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`violationCount` int NOT NULL DEFAULT 0,
	`windowStartedAt` timestamp,
	`lastViolationAt` timestamp,
	`blockedUntil` timestamp,
	`blockLevel` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `forum_user_moderation_id` PRIMARY KEY(`id`),
	CONSTRAINT `forum_user_moderation_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
ALTER TABLE `forum_user_moderation` ADD CONSTRAINT `forum_user_moderation_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;