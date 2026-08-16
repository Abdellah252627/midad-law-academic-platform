CREATE TABLE `sample_download_leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`productCode` varchar(32) NOT NULL,
	`fullName` varchar(160) NOT NULL,
	`email` varchar(320) NOT NULL,
	`whatsapp` varchar(32) NOT NULL,
	`consentVersion` varchar(32) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sample_download_leads_id` PRIMARY KEY(`id`)
);
