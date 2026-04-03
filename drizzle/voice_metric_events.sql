-- Run once on MySQL/TiDB if `voice_metric_events` does not exist.
CREATE TABLE IF NOT EXISTS `voice_metric_events` (
  `id` int NOT NULL AUTO_INCREMENT,
  `sessionId` varchar(128) DEFAULT NULL,
  `callId` varchar(128) DEFAULT NULL,
  `phase` varchar(64) NOT NULL,
  `msSinceCallStart` int DEFAULT NULL,
  `extra` json DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`),
  KEY `idx_voice_metric_session` (`sessionId`),
  KEY `idx_voice_metric_created` (`createdAt`)
);
