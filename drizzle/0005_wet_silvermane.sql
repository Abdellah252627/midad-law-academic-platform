CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actorUserId` int NOT NULL,
	`action` varchar(80) NOT NULL,
	`entityType` varchar(80) NOT NULL,
	`entityId` varchar(80),
	`productCode` varchar(32),
	`metadataJson` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `product_files` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productCode` varchar(32) NOT NULL,
	`fileType` enum('pdf','cover','sample') NOT NULL,
	`fileKey` varchar(512) NOT NULL,
	`fileName` varchar(220) NOT NULL,
	`contentType` varchar(100) NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`isActive` int NOT NULL DEFAULT 1,
	`uploadedByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `product_files_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `landing_chapters` ADD `deletedAt` timestamp;--> statement-breakpoint
ALTER TABLE `landing_faqs` ADD `deletedAt` timestamp;--> statement-breakpoint
ALTER TABLE `landing_products` ADD `deletedAt` timestamp;--> statement-breakpoint
ALTER TABLE `sample_download_leads` ADD `deletedAt` timestamp;