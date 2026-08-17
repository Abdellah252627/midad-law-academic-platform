CREATE TABLE `purchase_request_note_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`noteId` int NOT NULL,
	`requestId` int NOT NULL,
	`actorUserId` int NOT NULL,
	`action` enum('created','updated','deleted','restored') NOT NULL,
	`previousContent` text,
	`newContent` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `purchase_request_note_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purchase_request_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int NOT NULL,
	`content` text NOT NULL,
	`createdByUserId` int NOT NULL,
	`updatedByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deletedAt` timestamp,
	CONSTRAINT `purchase_request_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `purchase_request_note_events` ADD CONSTRAINT `purchase_request_note_events_noteId_purchase_request_notes_id_fk` FOREIGN KEY (`noteId`) REFERENCES `purchase_request_notes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_request_note_events` ADD CONSTRAINT `purchase_request_note_events_requestId_purchase_requests_id_fk` FOREIGN KEY (`requestId`) REFERENCES `purchase_requests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_request_notes` ADD CONSTRAINT `purchase_request_notes_requestId_purchase_requests_id_fk` FOREIGN KEY (`requestId`) REFERENCES `purchase_requests`(`id`) ON DELETE no action ON UPDATE no action;