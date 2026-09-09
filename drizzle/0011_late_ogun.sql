CREATE TABLE `prospection_dossiers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`routeEntryId` int,
	`clientName` varchar(160) NOT NULL,
	`cnpj` varchar(18) NOT NULL DEFAULT '',
	`routeKey` varchar(120) NOT NULL DEFAULT '',
	`source` enum('manual','portfolio') NOT NULL DEFAULT 'manual',
	`stage` enum('pesquisa','preparo','agendamento','visita','negociacao','arquivado') NOT NULL DEFAULT 'pesquisa',
	`publicSnapshotJson` text,
	`hypotheses` text,
	`agentNotes` text,
	`lastResearchedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `prospection_dossiers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `prospection_sources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dossierId` int NOT NULL,
	`sourceType` enum('cnpj','maps','web','instagram','site') NOT NULL,
	`label` varchar(160) NOT NULL,
	`url` varchar(1000) NOT NULL,
	`accessedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `prospection_sources_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `prospection_dossiers` ADD CONSTRAINT `prospection_dossiers_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `prospection_dossiers` ADD CONSTRAINT `prospection_dossiers_routeEntryId_route_portfolio_entries_id_fk` FOREIGN KEY (`routeEntryId`) REFERENCES `route_portfolio_entries`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `prospection_sources` ADD CONSTRAINT `prospection_sources_dossierId_prospection_dossiers_id_fk` FOREIGN KEY (`dossierId`) REFERENCES `prospection_dossiers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `prospection_dossiers_user_idx` ON `prospection_dossiers` (`userId`);--> statement-breakpoint
CREATE INDEX `prospection_dossiers_route_idx` ON `prospection_dossiers` (`routeKey`);--> statement-breakpoint
CREATE INDEX `prospection_sources_dossier_idx` ON `prospection_sources` (`dossierId`);