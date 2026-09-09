CREATE TABLE `agent_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`displayName` varchar(120) NOT NULL,
	`targetVariable` double NOT NULL DEFAULT 0,
	`defaultGoalTpv` double NOT NULL DEFAULT 300000,
	`profileVisibleInRanking` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agent_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `agent_profiles_user_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `email_credentials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`passwordHash` varchar(256) NOT NULL,
	`passwordSalt` varchar(128) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `email_credentials_id` PRIMARY KEY(`id`),
	CONSTRAINT `email_credentials_user_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `monthly_goals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`monthKey` varchar(7) NOT NULL,
	`targetVariable` double NOT NULL DEFAULT 0,
	`targetTpv` double NOT NULL DEFAULT 0,
	`actualTpv` double NOT NULL DEFAULT 0,
	`actualVariable` double NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `monthly_goals_id` PRIMARY KEY(`id`),
	CONSTRAINT `monthly_goals_user_month_unique` UNIQUE(`userId`,`monthKey`)
);
--> statement-breakpoint
CREATE TABLE `point_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`kind` varchar(48) NOT NULL,
	`label` varchar(160) NOT NULL,
	`points` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `point_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `psv_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`weekOf` varchar(10) NOT NULL,
	`targetVariable` double NOT NULL DEFAULT 0,
	`currentVariable` double NOT NULL DEFAULT 0,
	`plannedMultiplier` double NOT NULL DEFAULT 2,
	`weeksRemaining` int NOT NULL DEFAULT 1,
	`recommendedTpv` double NOT NULL DEFAULT 0,
	`recommendedClients30` int NOT NULL DEFAULT 0,
	`recommendedClients50` int NOT NULL DEFAULT 0,
	`recommendedClients100` int NOT NULL DEFAULT 0,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `psv_plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rmr_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`periodLabel` varchar(80) NOT NULL,
	`workingDays` int NOT NULL DEFAULT 20,
	`salesTasks` int NOT NULL DEFAULT 0,
	`proposals` int NOT NULL DEFAULT 0,
	`closedClients` int NOT NULL DEFAULT 0,
	`closedTpv` double NOT NULL DEFAULT 0,
	`goalTpv` double NOT NULL DEFAULT 300000,
	`globalKpi` double NOT NULL DEFAULT 0,
	`variableValue` double NOT NULL DEFAULT 0,
	`pointsAwarded` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `rmr_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `simulations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`periodLabel` varchar(80) NOT NULL,
	`goalTpv` double NOT NULL DEFAULT 0,
	`eligibleTpv` double NOT NULL DEFAULT 0,
	`hunterTpv` double NOT NULL DEFAULT 0,
	`newSalesBase` double NOT NULL DEFAULT 0,
	`multiplier` double NOT NULL DEFAULT 0,
	`finalVariable` double NOT NULL DEFAULT 0,
	`detailsJson` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `simulations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
ALTER TABLE `agent_profiles` ADD CONSTRAINT `agent_profiles_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `email_credentials` ADD CONSTRAINT `email_credentials_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `monthly_goals` ADD CONSTRAINT `monthly_goals_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `point_events` ADD CONSTRAINT `point_events_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `psv_plans` ADD CONSTRAINT `psv_plans_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rmr_records` ADD CONSTRAINT `rmr_records_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `simulations` ADD CONSTRAINT `simulations_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;