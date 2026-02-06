CREATE TABLE `emailTemplates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(256) NOT NULL,
	`category` enum('rent_reminder','maintenance','viewing','breach_letter','general') NOT NULL,
	`subject` text NOT NULL,
	`body` text NOT NULL,
	`variables` text,
	`description` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `emailTemplates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `communications` MODIFY COLUMN `status` enum('draft','pending_approval','approved','scheduled','sent','failed','cancelled') DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE `communications` ADD `scheduledFor` timestamp;--> statement-breakpoint
ALTER TABLE `emailTemplates` ADD CONSTRAINT `emailTemplates_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;