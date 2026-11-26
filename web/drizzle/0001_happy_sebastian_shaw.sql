CREATE TABLE `reservation_participants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reservationId` int NOT NULL,
	`name` varchar(120) NOT NULL,
	`ra` varchar(24) NOT NULL,
	`semester` varchar(40) NOT NULL,
	`course` varchar(100) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reservation_participants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reservations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reservationDate` varchar(10) NOT NULL,
	`startTime` varchar(5) NOT NULL,
	`endTime` varchar(5) NOT NULL,
	`responsibleName` varchar(120) NOT NULL,
	`responsibleRa` varchar(24) NOT NULL,
	`status` enum('active','cancelled') NOT NULL DEFAULT 'active',
	`confirmationCode` varchar(16) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reservations_id` PRIMARY KEY(`id`),
	CONSTRAINT `reservations_confirmationCode_unique` UNIQUE(`confirmationCode`),
	CONSTRAINT `reservations_slot_unique` UNIQUE(`reservationDate`,`startTime`)
);
--> statement-breakpoint
ALTER TABLE `reservation_participants` ADD CONSTRAINT `reservation_participants_reservationId_reservations_id_fk` FOREIGN KEY (`reservationId`) REFERENCES `reservations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `participants_reservation_idx` ON `reservation_participants` (`reservationId`);--> statement-breakpoint
CREATE INDEX `reservations_date_idx` ON `reservations` (`reservationDate`);