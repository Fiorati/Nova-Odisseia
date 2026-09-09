ALTER TABLE `route_portfolio_entries` ADD `phone` varchar(48) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `route_portfolio_entries` ADD `city` varchar(120) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `route_portfolio_entries` ADD `lastInteraction` varchar(160) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `route_portfolio_entries` ADD `nextAction` varchar(320) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `route_portfolio_imports` ADD `sourceType` varchar(32) DEFAULT 'arquivo' NOT NULL;--> statement-breakpoint
ALTER TABLE `route_portfolio_imports` ADD `sourceOrigin` varchar(160) DEFAULT 'arquivo local' NOT NULL;