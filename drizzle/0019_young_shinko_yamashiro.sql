CREATE TABLE `agent_team_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`about` text,
	`strengths` text,
	`developmentAreas` text,
	`careerObjective` text,
	`currentFocus` text,
	`personalCommitment` text,
	`professionalCommitment` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agent_team_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `agent_team_profiles_user_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `team_daily_promises` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`promiseDate` varchar(10) NOT NULL,
	`proposals` int NOT NULL DEFAULT 0,
	`newClients` int NOT NULL DEFAULT 0,
	`newClientsTpv` double NOT NULL DEFAULT 0,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `team_daily_promises_id` PRIMARY KEY(`id`),
	CONSTRAINT `team_daily_promises_user_date_unique` UNIQUE(`userId`,`promiseDate`)
);
--> statement-breakpoint
CREATE TABLE `team_schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scopeType` varchar(20) NOT NULL,
	`scopeId` int,
	`dupla` varchar(120),
	`weekday` int NOT NULL,
	`startTime` varchar(5) NOT NULL,
	`endTime` varchar(5) NOT NULL,
	`activity` varchar(160) NOT NULL,
	`description` text,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `team_schedules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `agent_team_profiles` ADD CONSTRAINT `agent_team_profiles_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `team_daily_promises` ADD CONSTRAINT `team_daily_promises_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `team_daily_promises_user_idx` ON `team_daily_promises` (`userId`);--> statement-breakpoint
CREATE INDEX `team_schedules_scope_idx` ON `team_schedules` (`scopeType`,`scopeId`);--> statement-breakpoint
CREATE INDEX `team_schedules_weekday_idx` ON `team_schedules` (`weekday`);