ALTER TABLE `complaints` ADD `adminResponse` text;--> statement-breakpoint
ALTER TABLE `complaints` ADD `responseUpdatedByUserId` int;--> statement-breakpoint
ALTER TABLE `complaints` ADD `responseUpdatedAt` timestamp;