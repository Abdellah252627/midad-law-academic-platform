CREATE TABLE `app_settings` (
	`settingKey` varchar(120) NOT NULL,
	`settingValue` text NOT NULL,
	`description` varchar(300),
	`updatedByUserId` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `app_settings_settingKey` PRIMARY KEY(`settingKey`)
);
