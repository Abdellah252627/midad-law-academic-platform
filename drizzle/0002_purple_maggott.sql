CREATE TABLE `landing_chapters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productCode` varchar(32) NOT NULL,
	`chapterNumber` varchar(8) NOT NULL,
	`title` varchar(220) NOT NULL,
	`excerpt` text NOT NULL,
	`questionsJson` text NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	`isPublished` int NOT NULL DEFAULT 1,
	CONSTRAINT `landing_chapters_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `landing_faqs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productCode` varchar(32) NOT NULL,
	`question` varchar(300) NOT NULL,
	`answer` text NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	`isPublished` int NOT NULL DEFAULT 1,
	CONSTRAINT `landing_faqs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `landing_products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productCode` varchar(32) NOT NULL,
	`title` varchar(220) NOT NULL,
	`category` varchar(120) NOT NULL,
	`university` varchar(180) NOT NULL,
	`track` varchar(180),
	`description` text NOT NULL,
	`priceMad` int NOT NULL,
	`isPublished` int NOT NULL DEFAULT 1,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `landing_products_id` PRIMARY KEY(`id`),
	CONSTRAINT `landing_products_productCode_unique` UNIQUE(`productCode`)
);
