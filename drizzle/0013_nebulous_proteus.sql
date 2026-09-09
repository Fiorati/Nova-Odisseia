CREATE TABLE `psv_weekly_rituals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`weekOf` varchar(10) NOT NULL,
	`dailyResult` text,
	`dailyPlan` text,
	`weeklyRoute` text,
	`preparedLeadIdsJson` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `psv_weekly_rituals_id` PRIMARY KEY(`id`),
	CONSTRAINT `psv_weekly_rituals_user_week_uq` UNIQUE(`userId`,`weekOf`)
);
--> statement-breakpoint
ALTER TABLE `psv_weekly_rituals` ADD CONSTRAINT `psv_weekly_rituals_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;