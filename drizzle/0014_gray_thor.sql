CREATE TABLE `engagement_campaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerUserId` int NOT NULL,
	`scope` enum('polo','distrital') NOT NULL,
	`regional` varchar(120) NOT NULL DEFAULT '',
	`district` varchar(120) NOT NULL DEFAULT '',
	`polo` varchar(120) NOT NULL DEFAULT '',
	`title` varchar(160) NOT NULL,
	`objective` text,
	`status` enum('rascunho','ativa','concluida','arquivada') NOT NULL DEFAULT 'rascunho',
	`startAt` timestamp,
	`endAt` timestamp,
	`targetParticipants` int NOT NULL DEFAULT 0,
	`targetParticipationRate` double NOT NULL DEFAULT 0,
	`targetPsvs` int NOT NULL DEFAULT 0,
	`targetTpv` double NOT NULL DEFAULT 0,
	`targetNewClients` int NOT NULL DEFAULT 0,
	`actualParticipants` int NOT NULL DEFAULT 0,
	`actualPsvs` int NOT NULL DEFAULT 0,
	`actualTpv` double NOT NULL DEFAULT 0,
	`actualNewClients` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `engagement_campaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `engagement_campaigns` ADD CONSTRAINT `engagement_campaigns_ownerUserId_users_id_fk` FOREIGN KEY (`ownerUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `engagement_campaigns_owner_idx` ON `engagement_campaigns` (`ownerUserId`);--> statement-breakpoint
CREATE INDEX `engagement_campaigns_scope_idx` ON `engagement_campaigns` (`district`,`polo`,`status`);