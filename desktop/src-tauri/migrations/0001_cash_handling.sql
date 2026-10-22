ALTER TABLE `orders` ADD `tendered` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `change_given` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE `orders` SET `tendered` = `total`, `change_given` = 0;
