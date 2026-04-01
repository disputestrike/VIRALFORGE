-- Knowledge base tables (Part 1 feature #2) — scoped to users.id (not bundle `accounts`)
-- Run after existing migrations. Safe: CREATE IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS `knowledge_bases` (
  `id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
  `userId` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `status` enum('training','active','failed') NOT NULL DEFAULT 'training',
  `trainingProgress` int NOT NULL DEFAULT 0,
  `lastTrainedAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_kb_user` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `knowledge_base_sources` (
  `id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
  `knowledgeBaseId` int NOT NULL,
  `sourceType` enum('website','pdf','word','txt','html','markdown','faq') NOT NULL,
  `sourceUrl` varchar(2048),
  `fileName` varchar(255),
  `filePath` varchar(2048),
  `fileSize` int,
  `contentHash` varchar(64),
  `status` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
  `errorMessage` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_kbs_kb` (`knowledgeBaseId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `knowledge_base_chunks` (
  `id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
  `knowledgeBaseId` int NOT NULL,
  `sourceId` int,
  `content` text NOT NULL,
  `embedding` text,
  `metadata` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  INDEX `idx_kbc_kb` (`knowledgeBaseId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
