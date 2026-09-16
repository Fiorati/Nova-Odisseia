CREATE TABLE `best_practice_posts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`authorUserId` int NOT NULL,
	`authorName` varchar(160) NOT NULL,
	`title` varchar(160) NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `best_practice_posts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `psv_demands` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(240) NOT NULL,
	`category` varchar(80) NOT NULL DEFAULT 'Comercial',
	`dueDate` varchar(10) NOT NULL,
	`completed` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `psv_demands_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `team_member_roles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`role` varchar(32) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `team_member_roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `team_member_roles_user_role_uq` UNIQUE(`userId`,`role`)
);
--> statement-breakpoint
ALTER TABLE `team_daily_promises` ADD `salesTasks` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `team_daily_promises` ADD `closedTpv` double DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `best_practice_posts` ADD CONSTRAINT `best_practice_posts_authorUserId_users_id_fk` FOREIGN KEY (`authorUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `psv_demands` ADD CONSTRAINT `psv_demands_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `team_member_roles` ADD CONSTRAINT `team_member_roles_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `best_practice_posts_created_at_idx` ON `best_practice_posts` (`createdAt`);--> statement-breakpoint
CREATE INDEX `psv_demands_user_due_date_idx` ON `psv_demands` (`userId`,`dueDate`);--> statement-breakpoint
CREATE INDEX `team_member_roles_user_idx` ON `team_member_roles` (`userId`);