CREATE TABLE `route_portfolio_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`importId` int NOT NULL,
	`portfolioType` enum('base','route') NOT NULL,
	`route` varchar(120) NOT NULL,
	`routeKey` varchar(120) NOT NULL,
	`clientName` varchar(160) NOT NULL,
	`document` varchar(32) NOT NULL DEFAULT '',
	`mcc` varchar(8) NOT NULL DEFAULT '',
	`cnae` varchar(24) NOT NULL DEFAULT '',
	`segment` varchar(160) NOT NULL DEFAULT '',
	`projectedTpv` double NOT NULL DEFAULT 0,
	`stage` varchar(80) NOT NULL DEFAULT '',
	`temperature` varchar(32) NOT NULL DEFAULT '',
	`nextContactAt` timestamp,
	`notes` text,
	`rawJson` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `route_portfolio_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `route_portfolio_imports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`portfolioType` enum('base','route') NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileKey` varchar(512) NOT NULL,
	`rowCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `route_portfolio_imports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `route_portfolio_entries` ADD CONSTRAINT `route_portfolio_entries_importId_route_portfolio_imports_id_fk` FOREIGN KEY (`importId`) REFERENCES `route_portfolio_imports`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `route_portfolio_imports` ADD CONSTRAINT `route_portfolio_imports_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `route_portfolio_entries_route_type_idx` ON `route_portfolio_entries` (`routeKey`,`portfolioType`);