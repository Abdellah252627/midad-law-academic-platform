CREATE TABLE `analytics_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventType` enum('page_view','sample_download','purchase_request') NOT NULL,
	`productCode` varchar(32) NOT NULL,
	`visitorKey` varchar(120),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `analytics_events_id` PRIMARY KEY(`id`)
);
