CREATE TABLE `support_follow_ups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productCode` varchar(32) NOT NULL DEFAULT 'MIDAD-001',
	`phone` varchar(32),
	`message` varchar(1000),
	`status` enum('new','contacted','closed') NOT NULL DEFAULT 'new',
	`adminNote` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`contactedAt` timestamp,
	CONSTRAINT `support_follow_ups_id` PRIMARY KEY(`id`)
);
