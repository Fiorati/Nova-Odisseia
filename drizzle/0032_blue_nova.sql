ALTER TABLE `news_articles` ADD `pinned` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `best_practice_posts` DROP COLUMN `attachmentMimeType`;