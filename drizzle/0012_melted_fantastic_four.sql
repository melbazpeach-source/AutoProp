CREATE TABLE `invoiceLineItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`invoiceId` int NOT NULL,
	`description` text NOT NULL,
	`quantity` decimal(10,2),
	`unitPrice` decimal(10,2),
	`lineTotal` decimal(10,2),
	`category` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `invoiceLineItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invoices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`invoiceNumber` varchar(128) NOT NULL,
	`contractorName` varchar(256) NOT NULL,
	`contractorEmail` varchar(320),
	`contractorPhone` varchar(32),
	`invoiceDate` timestamp,
	`dueDate` timestamp,
	`subtotal` decimal(10,2),
	`gstAmount` decimal(10,2),
	`totalAmount` decimal(10,2) NOT NULL,
	`description` text,
	`documentUrl` text,
	`ocrExtractedData` text,
	`matchedMaintenanceId` int,
	`matchConfidence` decimal(5,2),
	`discrepancies` text,
	`status` enum('pending','received','under_review','approved','rejected','paid','overdue') NOT NULL DEFAULT 'pending',
	`paymentStatus` enum('unpaid','partial','paid') NOT NULL DEFAULT 'unpaid',
	`amountPaid` decimal(10,2) DEFAULT '0',
	`paymentDate` timestamp,
	`paymentMethod` varchar(64),
	`paymentReference` varchar(256),
	`approvedBy` int,
	`approvedAt` timestamp,
	`rejectedBy` int,
	`rejectedAt` timestamp,
	`rejectionReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `invoices_id` PRIMARY KEY(`id`),
	CONSTRAINT `invoices_invoiceNumber_unique` UNIQUE(`invoiceNumber`)
);
--> statement-breakpoint
ALTER TABLE `invoiceLineItems` ADD CONSTRAINT `invoiceLineItems_invoiceId_invoices_id_fk` FOREIGN KEY (`invoiceId`) REFERENCES `invoices`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_matchedMaintenanceId_maintenanceRequests_id_fk` FOREIGN KEY (`matchedMaintenanceId`) REFERENCES `maintenanceRequests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_approvedBy_users_id_fk` FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_rejectedBy_users_id_fk` FOREIGN KEY (`rejectedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;