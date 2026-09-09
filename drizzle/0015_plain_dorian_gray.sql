CREATE TABLE `security_audit_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actorUserId` int NOT NULL,
	`eventType` varchar(64) NOT NULL,
	`targetType` varchar(64) NOT NULL,
	`targetId` varchar(120) NOT NULL,
	`scope` varchar(160) NOT NULL DEFAULT '',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `security_audit_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `security_audit_events` ADD CONSTRAINT `security_audit_events_actorUserId_users_id_fk` FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `security_audit_actor_created_at_idx` ON `security_audit_events` (`actorUserId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `security_audit_event_created_at_idx` ON `security_audit_events` (`eventType`,`createdAt`);