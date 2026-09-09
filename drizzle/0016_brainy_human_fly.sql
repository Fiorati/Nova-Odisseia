CREATE TABLE `spartacus_pdis` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`learnerRole` enum('agente','polo','distrital') NOT NULL DEFAULT 'agente',
	`developmentGoal` varchar(400) NOT NULL DEFAULT '',
	`hardSkillIdsJson` text NOT NULL,
	`softSkillIdsJson` text NOT NULL,
	`studyMinutes` int NOT NULL DEFAULT 25,
	`planJson` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `spartacus_pdis_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `spartacus_pdis` ADD CONSTRAINT `spartacus_pdis_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `spartacus_pdis_user_created_at_idx` ON `spartacus_pdis` (`userId`,`createdAt`);