CREATE TABLE `ai_cache` (
	`key` text PRIMARY KEY NOT NULL,
	`result` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ai_usage` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`property_id` text,
	`purpose` text NOT NULL,
	`model` text NOT NULL,
	`input_tokens` integer DEFAULT 0 NOT NULL,
	`output_tokens` integer DEFAULT 0 NOT NULL,
	`cost_usd` real DEFAULT 0 NOT NULL,
	`items` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `ai_usage_property_idx` ON `ai_usage` (`property_id`);--> statement-breakpoint
CREATE TABLE `analytics_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_type` text NOT NULL,
	`tour_id` text,
	`property_id` text,
	`user_id` text,
	`room_id` text,
	`media_id` text,
	`session_id` text,
	`source` text,
	`value` real,
	`meta` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `events_tour_idx` ON `analytics_events` (`tour_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `events_type_idx` ON `analytics_events` (`event_type`,`created_at`);--> statement-breakpoint
CREATE TABLE `floors` (
	`id` text PRIMARY KEY NOT NULL,
	`property_id` text NOT NULL,
	`name` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`plan_type` text DEFAULT 'none' NOT NULL,
	`plan_media_id` text,
	`aspect_ratio` real DEFAULT 1.5 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `floors_property_idx` ON `floors` (`property_id`);--> statement-breakpoint
CREATE TABLE `media` (
	`id` text PRIMARY KEY NOT NULL,
	`property_id` text NOT NULL,
	`room_id` text,
	`kind` text NOT NULL,
	`status` text DEFAULT 'ready' NOT NULL,
	`original_key` text,
	`variants` text NOT NULL,
	`width` integer,
	`height` integer,
	`mime_type` text,
	`size_bytes` integer,
	`original_filename` text,
	`content_hash` text,
	`dhash` text,
	`blur_data_url` text,
	`caption` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`room_assigned_by` text,
	`duration_sec` real,
	`ai_category` text,
	`ai_confidence` real,
	`ai_features` text,
	`ai_caption` text,
	`ai_quality` integer,
	`ai_duplicate_of` text,
	`ai_source` text,
	`ai_model` text,
	`ai_analyzed_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `media_property_idx` ON `media` (`property_id`);--> statement-breakpoint
CREATE INDEX `media_room_idx` ON `media` (`room_id`);--> statement-breakpoint
CREATE INDEX `media_hash_idx` ON `media` (`content_hash`);--> statement-breakpoint
CREATE TABLE `properties` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`tour_title` text NOT NULL,
	`address` text,
	`property_type` text DEFAULT 'house' NOT NULL,
	`description` text,
	`bedrooms` real,
	`bathrooms` real,
	`square_feet` integer,
	`year_built` integer,
	`neighborhood` text,
	`amenities` text NOT NULL,
	`contact_name` text,
	`contact_email` text,
	`contact_phone` text,
	`contact_company` text,
	`cover_media_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `properties_owner_idx` ON `properties` (`owner_id`);--> statement-breakpoint
CREATE TABLE `rooms` (
	`id` text PRIMARY KEY NOT NULL,
	`property_id` text NOT NULL,
	`floor_id` text,
	`name` text NOT NULL,
	`category` text DEFAULT 'other' NOT NULL,
	`icon` text DEFAULT 'sparkles' NOT NULL,
	`description` text,
	`description_source` text,
	`features` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`hotspot_x` real,
	`hotspot_y` real,
	`region` text,
	`cover_media_id` text,
	`video_url` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`floor_id`) REFERENCES `floors`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `rooms_property_idx` ON `rooms` (`property_id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `tours` (
	`id` text PRIMARY KEY NOT NULL,
	`property_id` text NOT NULL,
	`slug` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`published_at` integer,
	`settings` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tours_slug_idx` ON `tours` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `tours_property_idx` ON `tours` (`property_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text,
	`password_hash` text,
	`name` text,
	`is_guest` integer DEFAULT true NOT NULL,
	`plan` text DEFAULT 'free' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);