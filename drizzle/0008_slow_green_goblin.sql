ALTER TABLE `nordic_monthly_plans` ADD `targetClients7To15` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `nordic_monthly_plans` ADD `targetClients15To30` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `nordic_monthly_plans` ADD `averageRv7To15` double DEFAULT 50 NOT NULL;--> statement-breakpoint
ALTER TABLE `nordic_monthly_plans` ADD `averageRv15To30` double DEFAULT 80 NOT NULL;--> statement-breakpoint
ALTER TABLE `nordic_monthly_plans` ADD `averageRv30To50` double DEFAULT 150 NOT NULL;--> statement-breakpoint
ALTER TABLE `nordic_monthly_plans` ADD `averageRv50To100` double DEFAULT 300 NOT NULL;--> statement-breakpoint
ALTER TABLE `nordic_monthly_plans` ADD `averageRv100Plus` double DEFAULT 800 NOT NULL;--> statement-breakpoint
ALTER TABLE `nordic_monthly_plans` ADD `actualSalesTasks` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `nordic_monthly_plans` ADD `actualProposals` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `nordic_monthly_plans` ADD `actualClients7To15` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `nordic_monthly_plans` ADD `actualClients15To30` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `nordic_monthly_plans` ADD `actualClients30To50` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `nordic_monthly_plans` ADD `actualClients50To100` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `nordic_monthly_plans` ADD `actualClients100To200` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `nordic_monthly_plans` ADD `actualClients200Plus` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `nordic_monthly_plans` ADD `actualTpv` double DEFAULT 0 NOT NULL;