ALTER TABLE `agent_profiles` MODIFY COLUMN `leadershipRole` enum('none','polo','interino','distrital','sdr') NOT NULL DEFAULT 'none';--> statement-breakpoint
ALTER TABLE `email_verification_challenges` MODIFY COLUMN `leadershipRole` enum('none','polo','interino','distrital','sdr') NOT NULL DEFAULT 'none';
