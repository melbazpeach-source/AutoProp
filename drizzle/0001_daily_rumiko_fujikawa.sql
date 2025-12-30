CREATE TABLE `calendarSlots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slotType` enum('viewing','maintenance','inspection') NOT NULL,
	`startTime` timestamp NOT NULL,
	`endTime` timestamp NOT NULL,
	`available` boolean DEFAULT true,
	`allocatedBy` int,
	`propertyId` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `calendarSlots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `communications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`channel` enum('email','sms','whatsapp','phone','voicemail') NOT NULL,
	`direction` enum('inbound','outbound') NOT NULL,
	`fromAddress` varchar(320),
	`toAddress` varchar(320),
	`subject` text,
	`body` text,
	`attachmentUrls` text,
	`tenantId` int,
	`propertyId` int,
	`ticketId` int,
	`autoResponded` boolean DEFAULT false,
	`autoResponseSentAt` timestamp,
	`externalId` varchar(256),
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `communications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dailySummaries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`summaryDate` timestamp NOT NULL,
	`managerId` int NOT NULL,
	`totalTickets` int DEFAULT 0,
	`newTickets` int DEFAULT 0,
	`resolvedTickets` int DEFAULT 0,
	`arrearsCount` int DEFAULT 0,
	`maintenanceRequests` int DEFAULT 0,
	`viewingsScheduled` int DEFAULT 0,
	`summaryContent` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `dailySummaries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`documentType` enum('application','lease','breach_letter','maintenance_report','inspection','communication_attachment','other') NOT NULL,
	`fileName` varchar(512) NOT NULL,
	`fileKey` varchar(512) NOT NULL,
	`fileUrl` text NOT NULL,
	`mimeType` varchar(128),
	`fileSize` bigint,
	`propertyId` int,
	`tenantId` int,
	`ticketId` int,
	`maintenanceRequestId` int,
	`uploadedBy` int,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `integrationSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`service` enum('palace','outlook','twilio','whatsapp') NOT NULL,
	`enabled` boolean DEFAULT false,
	`configData` text,
	`lastSyncAt` timestamp,
	`syncStatus` enum('idle','syncing','error') DEFAULT 'idle',
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `integrationSettings_id` PRIMARY KEY(`id`),
	CONSTRAINT `integrationSettings_service_unique` UNIQUE(`service`)
);
--> statement-breakpoint
CREATE TABLE `maintenanceRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`propertyId` int NOT NULL,
	`tenantId` int,
	`ticketId` int,
	`title` text NOT NULL,
	`description` text,
	`category` enum('plumbing','electrical','hvac','structural','appliance','pest','garden','other'),
	`urgency` enum('routine','urgent','emergency') DEFAULT 'routine',
	`status` enum('draft','pending_approval','approved','scheduled','in_progress','completed','cancelled') NOT NULL,
	`estimatedCost` decimal(10,2),
	`actualCost` decimal(10,2),
	`scheduledDate` timestamp,
	`completedDate` timestamp,
	`contractorName` varchar(256),
	`contractorContact` varchar(128),
	`approvedBy` int,
	`approvedAt` timestamp,
	`notes` text,
	`documentUrls` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `maintenanceRequests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('rent_arrears','maintenance_urgent','viewing_confirmation','daily_summary','ticket_assigned','approval_required','other') NOT NULL,
	`title` varchar(512) NOT NULL,
	`message` text NOT NULL,
	`priority` enum('low','medium','high','urgent') DEFAULT 'medium',
	`read` boolean DEFAULT false,
	`readAt` timestamp,
	`actionUrl` text,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `properties` (
	`id` int AUTO_INCREMENT NOT NULL,
	`palaceId` varchar(128),
	`address` text NOT NULL,
	`suburb` varchar(128),
	`state` varchar(64),
	`postcode` varchar(16),
	`propertyType` varchar(64),
	`bedrooms` int,
	`bathrooms` int,
	`parkingSpaces` int,
	`weeklyRent` decimal(10,2),
	`status` enum('vacant','occupied','maintenance','advertising') NOT NULL,
	`managerId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `properties_id` PRIMARY KEY(`id`),
	CONSTRAINT `properties_palaceId_unique` UNIQUE(`palaceId`)
);
--> statement-breakpoint
CREATE TABLE `rentArrears` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`propertyId` int NOT NULL,
	`amountOwed` decimal(10,2) NOT NULL,
	`daysOverdue` int NOT NULL,
	`lastPaymentDate` timestamp,
	`paymentArrangementBroken` boolean DEFAULT false,
	`breachLetterSent` boolean DEFAULT false,
	`breachLetterDate` timestamp,
	`escalationLevel` enum('none','reminder','breach','legal') DEFAULT 'none',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rentArrears_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tenants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`palaceId` varchar(128),
	`firstName` varchar(128) NOT NULL,
	`lastName` varchar(128) NOT NULL,
	`email` varchar(320),
	`phone` varchar(32),
	`mobilePhone` varchar(32),
	`propertyId` int,
	`leaseStartDate` timestamp,
	`leaseEndDate` timestamp,
	`rentAmount` decimal(10,2),
	`rentFrequency` enum('weekly','fortnightly','monthly'),
	`bondAmount` decimal(10,2),
	`status` enum('active','pending','ended','breached') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tenants_id` PRIMARY KEY(`id`),
	CONSTRAINT `tenants_palaceId_unique` UNIQUE(`palaceId`)
);
--> statement-breakpoint
CREATE TABLE `ticketActivities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ticketId` int NOT NULL,
	`userId` int,
	`activityType` enum('created','updated','assigned','commented','status_changed','resolved','closed') NOT NULL,
	`description` text NOT NULL,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ticketActivities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tickets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ticketNumber` varchar(32) NOT NULL,
	`type` enum('inquiry','maintenance','complaint','arrears','viewing','application','other') NOT NULL,
	`status` enum('open','pending','in_progress','waiting_approval','resolved','closed') NOT NULL,
	`priority` enum('low','medium','high','urgent') DEFAULT 'medium',
	`subject` text NOT NULL,
	`description` text,
	`tenantId` int,
	`propertyId` int,
	`assignedTo` int,
	`createdBy` int,
	`resolvedAt` timestamp,
	`closedAt` timestamp,
	`dueDate` timestamp,
	`tags` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tickets_id` PRIMARY KEY(`id`),
	CONSTRAINT `tickets_ticketNumber_unique` UNIQUE(`ticketNumber`)
);
--> statement-breakpoint
CREATE TABLE `viewings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`propertyId` int NOT NULL,
	`prospectName` varchar(256) NOT NULL,
	`prospectEmail` varchar(320),
	`prospectPhone` varchar(32),
	`scheduledDate` timestamp NOT NULL,
	`duration` int DEFAULT 30,
	`status` enum('pending_approval','approved','confirmed','completed','cancelled','no_show') NOT NULL,
	`approvedBy` int,
	`approvedAt` timestamp,
	`moveInCostsSent` boolean DEFAULT false,
	`applicationFormSent` boolean DEFAULT false,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `viewings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `calendarSlots` ADD CONSTRAINT `calendarSlots_allocatedBy_users_id_fk` FOREIGN KEY (`allocatedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `calendarSlots` ADD CONSTRAINT `calendarSlots_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `communications` ADD CONSTRAINT `communications_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `communications` ADD CONSTRAINT `communications_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `communications` ADD CONSTRAINT `communications_ticketId_tickets_id_fk` FOREIGN KEY (`ticketId`) REFERENCES `tickets`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `dailySummaries` ADD CONSTRAINT `dailySummaries_managerId_users_id_fk` FOREIGN KEY (`managerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `documents` ADD CONSTRAINT `documents_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `documents` ADD CONSTRAINT `documents_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `documents` ADD CONSTRAINT `documents_ticketId_tickets_id_fk` FOREIGN KEY (`ticketId`) REFERENCES `tickets`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `documents` ADD CONSTRAINT `documents_maintenanceRequestId_maintenanceRequests_id_fk` FOREIGN KEY (`maintenanceRequestId`) REFERENCES `maintenanceRequests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `documents` ADD CONSTRAINT `documents_uploadedBy_users_id_fk` FOREIGN KEY (`uploadedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `maintenanceRequests` ADD CONSTRAINT `maintenanceRequests_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `maintenanceRequests` ADD CONSTRAINT `maintenanceRequests_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `maintenanceRequests` ADD CONSTRAINT `maintenanceRequests_ticketId_tickets_id_fk` FOREIGN KEY (`ticketId`) REFERENCES `tickets`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `maintenanceRequests` ADD CONSTRAINT `maintenanceRequests_approvedBy_users_id_fk` FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `properties` ADD CONSTRAINT `properties_managerId_users_id_fk` FOREIGN KEY (`managerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rentArrears` ADD CONSTRAINT `rentArrears_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rentArrears` ADD CONSTRAINT `rentArrears_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tenants` ADD CONSTRAINT `tenants_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ticketActivities` ADD CONSTRAINT `ticketActivities_ticketId_tickets_id_fk` FOREIGN KEY (`ticketId`) REFERENCES `tickets`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ticketActivities` ADD CONSTRAINT `ticketActivities_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_tenantId_tenants_id_fk` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_assignedTo_users_id_fk` FOREIGN KEY (`assignedTo`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `viewings` ADD CONSTRAINT `viewings_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `viewings` ADD CONSTRAINT `viewings_approvedBy_users_id_fk` FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;