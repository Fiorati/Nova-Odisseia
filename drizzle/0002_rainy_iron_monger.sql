CREATE TABLE `psv_pipeline_leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`clientName` varchar(160) NOT NULL,
	`temperature` enum('quente','frio') NOT NULL DEFAULT 'frio',
	`segmentId` varchar(96) NOT NULL DEFAULT '',
	`segmentLabel` varchar(160) NOT NULL DEFAULT '',
	`mcc` varchar(8) NOT NULL DEFAULT '',
	`cnae` varchar(24) NOT NULL DEFAULT '',
	`projectedTpv` double NOT NULL DEFAULT 0,
	`nextContactAt` timestamp,
	`stage` enum('mapeado','qualificando','planejado','negociacao') NOT NULL DEFAULT 'mapeado',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `psv_pipeline_leads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `agent_profiles` ADD `leadershipRole` enum('none','polo','distrital') DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE `psv_pipeline_leads` ADD CONSTRAINT `psv_pipeline_leads_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;