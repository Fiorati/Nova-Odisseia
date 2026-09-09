ALTER TABLE `rmr_records` ADD `rootCause` text;--> statement-breakpoint
ALTER TABLE `rmr_records` ADD `actionPlan` text;--> statement-breakpoint
ALTER TABLE `rmr_records` ADD `owner` varchar(120) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `rmr_records` ADD `expectedResult` text;--> statement-breakpoint
ALTER TABLE `rmr_records` ADD `dueAt` timestamp;