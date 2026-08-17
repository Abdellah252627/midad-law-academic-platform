CREATE TABLE `reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`order_id` int NOT NULL,
	`product_id` varchar(32) NOT NULL,
	`full_name` varchar(160) NOT NULL,
	`rating` int NOT NULL,
	`comment` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`is_visible` int NOT NULL DEFAULT 1,
	CONSTRAINT `reviews_id` PRIMARY KEY(`id`),
	CONSTRAINT `reviews_order_id_unique` UNIQUE(`order_id`)
);
--> statement-breakpoint
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_order_id_purchase_requests_id_fk` FOREIGN KEY (`order_id`) REFERENCES `purchase_requests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_product_id_landing_products_productCode_fk` FOREIGN KEY (`product_id`) REFERENCES `landing_products`(`productCode`) ON DELETE no action ON UPDATE no action;