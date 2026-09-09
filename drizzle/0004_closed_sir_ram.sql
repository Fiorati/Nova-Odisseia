CREATE TABLE `monthly_final_cards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`monthKey` varchar(7) NOT NULL,
	`globalKpi` double NOT NULL DEFAULT 0,
	`totalMigratedTpv` double NOT NULL DEFAULT 0,
	`multiplier` double NOT NULL DEFAULT 0,
	`actualVariable` double NOT NULL DEFAULT 0,
	`clients7To15` int NOT NULL DEFAULT 0,
	`clients15To30` int NOT NULL DEFAULT 0,
	`clients30To50` int NOT NULL DEFAULT 0,
	`clients50To100` int NOT NULL DEFAULT 0,
	`clients100Plus` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `monthly_final_cards_id` PRIMARY KEY(`id`),
	CONSTRAINT `monthly_final_cards_user_month_unique` UNIQUE(`userId`,`monthKey`)
);
--> statement-breakpoint
ALTER TABLE `monthly_final_cards` ADD CONSTRAINT `monthly_final_cards_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;