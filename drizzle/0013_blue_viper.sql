CREATE TABLE `complaints` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ticketNumber` varchar(32) NOT NULL,
	`requestId` int,
	`fullName` varchar(160) NOT NULL,
	`email` varchar(320) NOT NULL,
	`whatsapp` varchar(32),
	`category` enum('payment','proof','review','download','data','other') NOT NULL,
	`description` text NOT NULL,
	`status` enum('new','in_review','needs_info','responded','closed') NOT NULL DEFAULT 'new',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `complaints_id` PRIMARY KEY(`id`),
	CONSTRAINT `complaints_ticketNumber_unique` UNIQUE(`ticketNumber`)
);
--> statement-breakpoint
ALTER TABLE `complaints` ADD CONSTRAINT `complaints_requestId_purchase_requests_id_fk` FOREIGN KEY (`requestId`) REFERENCES `purchase_requests`(`id`) ON DELETE no action ON UPDATE no action;