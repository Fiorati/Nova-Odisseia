CREATE TABLE `password_reset_challenges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`codeHash` varchar(256) NOT NULL,
	`codeSalt` varchar(128) NOT NULL,
	`resetTokenHash` varchar(256) NOT NULL DEFAULT '',
	`resetTokenSalt` varchar(128) NOT NULL DEFAULT '',
	`expiresAt` timestamp NOT NULL,
	`verifiedAt` timestamp,
	`consumedAt` timestamp,
	`attempts` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `password_reset_challenges_id` PRIMARY KEY(`id`),
	CONSTRAINT `password_reset_challenges_user_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
ALTER TABLE `password_reset_challenges` ADD CONSTRAINT `password_reset_challenges_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;