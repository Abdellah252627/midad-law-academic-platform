CREATE TABLE `forum_moderators` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`grantedByUserId` int NOT NULL,
	`status` enum('active','revoked') NOT NULL DEFAULT 'active',
	`grantedAt` timestamp NOT NULL DEFAULT (now()),
	`revokedAt` timestamp,
	`revokedByUserId` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `forum_moderators_id` PRIMARY KEY(`id`),
	CONSTRAINT `forum_moderators_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
ALTER TABLE `forum_moderators` ADD CONSTRAINT `forum_moderators_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `forum_moderators` ADD CONSTRAINT `forum_moderators_grantedByUserId_users_id_fk` FOREIGN KEY (`grantedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `forum_moderators` ADD CONSTRAINT `forum_moderators_revokedByUserId_users_id_fk` FOREIGN KEY (`revokedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;