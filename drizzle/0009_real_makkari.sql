CREATE TABLE `tenancies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`propertyId` int NOT NULL,
	`tenantId` int NOT NULL,
	`leaseStartDate` timestamp NOT NULL,
	`leaseEndDate` timestamp,
	`weeklyRent` decimal(10,2) NOT NULL,
	`bondAmount` decimal(10,2),
	`status` enum('active','ending','terminated','completed') NOT NULL DEFAULT 'active',
	`tags` text,
	`isFlagged` boolean DEFAULT false,
	`isPinned` boolean DEFAULT false,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tenancies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tenancyAlerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenancyId` int NOT NULL,
	`alertType` enum('antisocial_behavior','court_hearing','complaint','terminate','rent_arrears','breach_notice','inspection_due','lease_expiry','other') NOT NULL,
	`title` varchar(256) NOT NULL,
	`description` text,
	`dueDate` timestamp,
	`priority` enum('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
	`status` enum('active','resolved','dismissed') NOT NULL DEFAULT 'active',
	`createdBy` int,
	`resolvedBy` int,
	`resolvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tenancyAlerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `tenancies` ADD CONSTRAINT `tenancies_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tenancies` ADD CONSTRAINT `tenancies_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tenancyAlerts` ADD CONSTRAINT `tenancyAlerts_tenancyId_tenancies_id_fk` FOREIGN KEY (`tenancyId`) REFERENCES `tenancies`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tenancyAlerts` ADD CONSTRAINT `tenancyAlerts_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tenancyAlerts` ADD CONSTRAINT `tenancyAlerts_resolvedBy_users_id_fk` FOREIGN KEY (`resolvedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;