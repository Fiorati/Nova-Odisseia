CREATE TABLE `spartacus_skill_progress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`pdiId` int NOT NULL,
	`skillId` varchar(80) NOT NULL,
	`progressPercent` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `spartacus_skill_progress_id` PRIMARY KEY(`id`),
	CONSTRAINT `spartacus_skill_progress_pdi_skill_uq` UNIQUE(`pdiId`,`skillId`)
);
--> statement-breakpoint
CREATE TABLE `user_notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`kind` varchar(48) NOT NULL,
	`title` varchar(160) NOT NULL,
	`body` varchar(400) NOT NULL DEFAULT '',
	`resourceId` varchar(120) NOT NULL DEFAULT '',
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `spartacus_skill_progress` ADD CONSTRAINT `spartacus_skill_progress_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `spartacus_skill_progress` ADD CONSTRAINT `spartacus_skill_progress_pdiId_spartacus_pdis_id_fk` FOREIGN KEY (`pdiId`) REFERENCES `spartacus_pdis`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_notifications` ADD CONSTRAINT `user_notifications_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `spartacus_skill_progress_user_pdi_idx` ON `spartacus_skill_progress` (`userId`,`pdiId`);--> statement-breakpoint
CREATE INDEX `user_notifications_user_created_idx` ON `user_notifications` (`userId`,`createdAt`);