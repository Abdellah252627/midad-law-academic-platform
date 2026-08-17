ALTER TABLE `purchase_requests` ADD `orderNumber` varchar(32) NULL;--> statement-breakpoint
UPDATE `purchase_requests` SET `orderNumber` = CONCAT('MIDAD-', LPAD(`id`, 8, '0')) WHERE `orderNumber` IS NULL;--> statement-breakpoint
ALTER TABLE `purchase_requests` MODIFY `orderNumber` varchar(32) NOT NULL;--> statement-breakpoint
ALTER TABLE `purchase_requests` ADD CONSTRAINT `purchase_requests_orderNumber_unique` UNIQUE(`orderNumber`); 
