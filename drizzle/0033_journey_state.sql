CREATE TABLE `journey_states` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `stateJson` text NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `journey_states_id` PRIMARY KEY(`id`),
  CONSTRAINT `journey_states_user_unique` UNIQUE(`userId`),
  CONSTRAINT `journey_states_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action
);
