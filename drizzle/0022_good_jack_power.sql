CREATE TABLE `admin_notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type` varchar(40) NOT NULL,
	`title` varchar(180) NOT NULL,
	`message` varchar(500) NOT NULL,
	`priority` enum('high','critical') NOT NULL DEFAULT 'high',
	`entityType` varchar(80),
	`entityId` varchar(80),
	`targetPath` varchar(255) NOT NULL,
	`isRead` boolean NOT NULL DEFAULT false,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `admin_notifications_id` PRIMARY KEY(`id`)
);
