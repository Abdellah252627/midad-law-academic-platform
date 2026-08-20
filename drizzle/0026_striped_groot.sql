CREATE TABLE `forum_blocked_words` (
	`id` int AUTO_INCREMENT NOT NULL,
	`term` varchar(120) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `forum_blocked_words_id` PRIMARY KEY(`id`),
	CONSTRAINT `forum_blocked_words_term_unique` UNIQUE(`term`)
);
--> statement-breakpoint
ALTER TABLE `forum_blocked_words` ADD CONSTRAINT `forum_blocked_words_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;