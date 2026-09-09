CREATE TABLE `email_verification_challenges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`name` varchar(120) NOT NULL,
	`leadershipRole` enum('none','polo','distrital') NOT NULL DEFAULT 'none',
	`codeHash` varchar(256) NOT NULL,
	`codeSalt` varchar(128) NOT NULL,
	`verificationTokenHash` varchar(256) NOT NULL DEFAULT '',
	`verificationTokenSalt` varchar(128) NOT NULL DEFAULT '',
	`expiresAt` timestamp NOT NULL,
	`verifiedAt` timestamp,
	`consumedAt` timestamp,
	`attempts` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `email_verification_challenges_id` PRIMARY KEY(`id`),
	CONSTRAINT `email_verification_challenges_email_unique` UNIQUE(`email`)
);
