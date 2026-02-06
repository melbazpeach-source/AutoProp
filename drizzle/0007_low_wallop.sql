ALTER TABLE `communications` ADD `status` enum('draft','pending_approval','approved','sent','failed','cancelled') DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE `communications` ADD `approvedBy` int;--> statement-breakpoint
ALTER TABLE `communications` ADD `approvedAt` timestamp;--> statement-breakpoint
ALTER TABLE `communications` ADD `sentAt` timestamp;--> statement-breakpoint
ALTER TABLE `communications` ADD CONSTRAINT `communications_approvedBy_users_id_fk` FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;