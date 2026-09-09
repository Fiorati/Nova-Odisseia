CREATE TABLE `nordic_activation_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`clientName` varchar(160) NOT NULL,
	`stoneCode` varchar(48) NOT NULL DEFAULT '',
	`mcc` varchar(8) NOT NULL DEFAULT '',
	`cnae` varchar(24) NOT NULL DEFAULT '',
	`segment` varchar(160) NOT NULL DEFAULT '',
	`realTpv` double NOT NULL DEFAULT 0,
	`projectedTpv` double NOT NULL DEFAULT 0,
	`productsReady` boolean NOT NULL DEFAULT false,
	`d15Complete` boolean NOT NULL DEFAULT false,
	`d30Complete` boolean NOT NULL DEFAULT false,
	`estimatedVariable` double NOT NULL DEFAULT 0,
	`status` enum('planejado','ativacao','acompanhamento','concluido') NOT NULL DEFAULT 'planejado',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `nordic_activation_plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `nordic_micro_routes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`area` varchar(160) NOT NULL,
	`visitAt` timestamp NOT NULL,
	`clientName` varchar(160) NOT NULL,
	`pipelineLeadId` int,
	`priority` enum('normal','quente','cem_mais') NOT NULL DEFAULT 'normal',
	`objective` varchar(240) NOT NULL DEFAULT 'Visita de diagnóstico',
	`status` enum('planejada','concluida','remarcada') NOT NULL DEFAULT 'planejada',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `nordic_micro_routes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `nordic_monthly_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`monthKey` varchar(7) NOT NULL,
	`targetSalesTasks` int NOT NULL DEFAULT 0,
	`targetProposals` int NOT NULL DEFAULT 0,
	`targetClients30To50` int NOT NULL DEFAULT 0,
	`targetClients50To100` int NOT NULL DEFAULT 0,
	`targetClients100To200` int NOT NULL DEFAULT 0,
	`targetClients200Plus` int NOT NULL DEFAULT 0,
	`targetTpv` double NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `nordic_monthly_plans_id` PRIMARY KEY(`id`),
	CONSTRAINT `nordic_monthly_plan_user_month_unique` UNIQUE(`userId`,`monthKey`)
);
--> statement-breakpoint
ALTER TABLE `agent_profiles` ADD `defaultGoalNewClients` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `monthly_goals` ADD `targetNewClients` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `nordic_activation_plans` ADD CONSTRAINT `nordic_activation_plans_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `nordic_micro_routes` ADD CONSTRAINT `nordic_micro_routes_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `nordic_micro_routes` ADD CONSTRAINT `nordic_micro_routes_pipelineLeadId_psv_pipeline_leads_id_fk` FOREIGN KEY (`pipelineLeadId`) REFERENCES `psv_pipeline_leads`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `nordic_monthly_plans` ADD CONSTRAINT `nordic_monthly_plans_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `nordic_micro_routes_user_visit_idx` ON `nordic_micro_routes` (`userId`,`visitAt`);