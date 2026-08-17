CREATE TABLE `purchase_request_corrections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int NOT NULL,
	`oldEmail` varchar(320) NOT NULL,
	`oldPhone` varchar(32),
	`requestedEmail` varchar(320),
	`requestedPhone` varchar(32),
	`reason` varchar(500),
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`reviewedByUserId` int,
	`reviewedAt` timestamp,
	`decisionNote` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `purchase_request_corrections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `purchase_request_corrections` ADD CONSTRAINT `purchase_request_corrections_requestId_purchase_requests_id_fk` FOREIGN KEY (`requestId`) REFERENCES `purchase_requests`(`id`) ON DELETE no action ON UPDATE no action;