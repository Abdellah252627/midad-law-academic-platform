ALTER TABLE `purchase_requests` ADD `proofContentType` varchar(80);--> statement-breakpoint
ALTER TABLE `purchase_requests` ADD `rejectionReason` varchar(500);--> statement-breakpoint
ALTER TABLE `purchase_requests` ADD `reviewedByUserId` int;