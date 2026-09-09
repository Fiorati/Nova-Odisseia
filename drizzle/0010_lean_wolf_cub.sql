CREATE TABLE `route_assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`route` varchar(120) NOT NULL,
	`routeKey` varchar(120) NOT NULL,
	`agentName` varchar(120) NOT NULL DEFAULT '',
	`agentEmail` varchar(320) NOT NULL DEFAULT '',
	`userId` int,
	`regional` varchar(120) NOT NULL DEFAULT '',
	`district` varchar(120) NOT NULL DEFAULT '',
	`polo` varchar(120) NOT NULL DEFAULT '',
	`updatedByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `route_assignments_id` PRIMARY KEY(`id`),
	CONSTRAINT `route_assignments_route_key_unique` UNIQUE(`routeKey`)
);
--> statement-breakpoint
ALTER TABLE `route_portfolio_imports` ADD `referenceMonth` varchar(7) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `route_portfolio_imports` ADD `sourceScope` enum('route','polo','district') DEFAULT 'route' NOT NULL;--> statement-breakpoint
ALTER TABLE `route_assignments` ADD CONSTRAINT `route_assignments_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `route_assignments` ADD CONSTRAINT `route_assignments_updatedByUserId_users_id_fk` FOREIGN KEY (`updatedByUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `route_assignments_user_idx` ON `route_assignments` (`userId`);