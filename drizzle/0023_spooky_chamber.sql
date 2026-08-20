CREATE TABLE `forum_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(80) NOT NULL,
	`name` varchar(160) NOT NULL,
	`description` varchar(500),
	`sortOrder` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `forum_categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `forum_categories_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `forum_replies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`topicId` int NOT NULL,
	`authorUserId` int NOT NULL,
	`body` text NOT NULL,
	`status` enum('pending','published','hidden') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `forum_replies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `forum_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reporterUserId` int NOT NULL,
	`topicId` int,
	`replyId` int,
	`reason` varchar(500) NOT NULL,
	`status` enum('open','reviewed','dismissed') NOT NULL DEFAULT 'open',
	`reviewedByUserId` int,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `forum_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `forum_topics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`categoryId` int NOT NULL,
	`authorUserId` int NOT NULL,
	`title` varchar(220) NOT NULL,
	`body` text NOT NULL,
	`status` enum('pending','published','hidden','closed') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `forum_topics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `forum_replies` ADD CONSTRAINT `forum_replies_topicId_forum_topics_id_fk` FOREIGN KEY (`topicId`) REFERENCES `forum_topics`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `forum_replies` ADD CONSTRAINT `forum_replies_authorUserId_users_id_fk` FOREIGN KEY (`authorUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `forum_reports` ADD CONSTRAINT `forum_reports_reporterUserId_users_id_fk` FOREIGN KEY (`reporterUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `forum_reports` ADD CONSTRAINT `forum_reports_topicId_forum_topics_id_fk` FOREIGN KEY (`topicId`) REFERENCES `forum_topics`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `forum_reports` ADD CONSTRAINT `forum_reports_replyId_forum_replies_id_fk` FOREIGN KEY (`replyId`) REFERENCES `forum_replies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `forum_topics` ADD CONSTRAINT `forum_topics_categoryId_forum_categories_id_fk` FOREIGN KEY (`categoryId`) REFERENCES `forum_categories`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `forum_topics` ADD CONSTRAINT `forum_topics_authorUserId_users_id_fk` FOREIGN KEY (`authorUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;