CREATE TABLE `ticketComments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ticketId` int NOT NULL,
	`userId` int,
	`commentType` enum('inbound','outbound','internal_note') NOT NULL,
	`content` text NOT NULL,
	`communicationId` int,
	`senderName` varchar(255),
	`senderEmail` varchar(320),
	`senderPhone` varchar(32),
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ticketComments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `communications` DROP FOREIGN KEY `communications_ticketId_tickets_id_fk`;
--> statement-breakpoint
ALTER TABLE `tickets` MODIFY COLUMN `status` enum('new','open','pending','in_progress','awaiting_approval','approved','sent','resolved','closed') NOT NULL;--> statement-breakpoint
ALTER TABLE `tickets` ADD `category` enum('communication','maintenance','notice','system_note') DEFAULT 'communication';--> statement-breakpoint
ALTER TABLE `tickets` ADD `source` enum('email','sms','whatsapp','phone','in_person','manual','palace_import','system') DEFAULT 'manual';--> statement-breakpoint
ALTER TABLE `tickets` ADD `tenancyId` int;--> statement-breakpoint
ALTER TABLE `tickets` ADD `palaceWoNumber` varchar(64);--> statement-breakpoint
ALTER TABLE `tickets` ADD `communicationId` int;--> statement-breakpoint
ALTER TABLE `tickets` ADD `parentTicketId` int;--> statement-breakpoint
ALTER TABLE `tickets` ADD `senderEmail` varchar(320);--> statement-breakpoint
ALTER TABLE `tickets` ADD `senderPhone` varchar(32);--> statement-breakpoint
ALTER TABLE `ticketComments` ADD CONSTRAINT `ticketComments_ticketId_tickets_id_fk` FOREIGN KEY (`ticketId`) REFERENCES `tickets`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ticketComments` ADD CONSTRAINT `ticketComments_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ticketComments` ADD CONSTRAINT `ticketComments_communicationId_communications_id_fk` FOREIGN KEY (`communicationId`) REFERENCES `communications`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_tenancyId_tenancies_id_fk` FOREIGN KEY (`tenancyId`) REFERENCES `tenancies`(`id`) ON DELETE no action ON UPDATE no action;