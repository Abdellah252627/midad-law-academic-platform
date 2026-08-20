CREATE TABLE `forum_rule_acceptances` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`rulesVersion` varchar(32) NOT NULL,
	`acceptedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `forum_rule_acceptances_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `forum_rule_acceptances` ADD CONSTRAINT `forum_rule_acceptances_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;