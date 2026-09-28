CREATE TABLE `articles` (
	`id` text PRIMARY KEY NOT NULL,
	`url` text NOT NULL,
	`title` text,
	`author` text,
	`site_name` text,
	`published_at` text,
	`saved_at` text NOT NULL,
	`content_key` text,
	`status` text NOT NULL,
	`extractor` text,
	`error` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `articles_url_unique` ON `articles` (`url`);--> statement-breakpoint
CREATE INDEX `articles_saved_at` ON `articles` (`saved_at`);--> statement-breakpoint
CREATE TABLE `highlights` (
	`id` text PRIMARY KEY NOT NULL,
	`article_id` text NOT NULL,
	`start_position` integer NOT NULL,
	`end_position` integer NOT NULL,
	`exact_text` text NOT NULL,
	`prefix_text` text NOT NULL,
	`suffix_text` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `highlights_article` ON `highlights` (`article_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `highlights_id_article` ON `highlights` (`id`,`article_id`);--> statement-breakpoint
CREATE TABLE `memos` (
	`id` text PRIMARY KEY NOT NULL,
	`article_id` text NOT NULL,
	`highlight_id` text,
	`content` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`article_id`) REFERENCES `articles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`highlight_id`) REFERENCES `highlights`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `memos_article` ON `memos` (`article_id`);