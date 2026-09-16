CREATE TABLE `meeting_leads` (
  `id` int AUTO_INCREMENT NOT NULL,
  `createdByUserId` int NOT NULL,
  `polo` varchar(120) NOT NULL DEFAULT '',
  `cnpj` varchar(40) NOT NULL DEFAULT '',
  `tradeName` varchar(160) NOT NULL,
  `segment` varchar(160) NOT NULL DEFAULT '',
  `route` varchar(120) NOT NULL DEFAULT '',
  `decisionMaker` varchar(160) NOT NULL DEFAULT '',
  `contact` varchar(160) NOT NULL DEFAULT '',
  `notes` text,
  `status` enum('novo','contato','agendada','realizada','cancelada') NOT NULL DEFAULT 'novo',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `meeting_leads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `meeting_period_metrics` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `periodKey` varchar(7) NOT NULL,
  `callsMade` int NOT NULL DEFAULT 0,
  `callsAnswered` int NOT NULL DEFAULT 0,
  `meetingsBooked` int NOT NULL DEFAULT 0,
  `clientsCredited` int NOT NULL DEFAULT 0,
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `meeting_period_metrics_id` PRIMARY KEY(`id`),
  CONSTRAINT `meeting_period_metrics_user_period_uq` UNIQUE(`userId`,`periodKey`)
);
--> statement-breakpoint
ALTER TABLE `meeting_leads` ADD CONSTRAINT `meeting_leads_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `meeting_period_metrics` ADD CONSTRAINT `meeting_period_metrics_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX `meeting_leads_polo_idx` ON `meeting_leads` (`polo`);
--> statement-breakpoint
CREATE INDEX `meeting_leads_creator_idx` ON `meeting_leads` (`createdByUserId`);
