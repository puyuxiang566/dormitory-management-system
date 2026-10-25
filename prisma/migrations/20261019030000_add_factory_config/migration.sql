-- CreateTable
CREATE TABLE `factory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `color` VARCHAR(191) NOT NULL DEFAULT '#10b981',
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Factory_code_key`(`code`),
    INDEX `Factory_isActive_idx`(`isActive`),
    INDEX `Factory_sortOrder_idx`(`sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Normalize legacy factory codes
UPDATE `person` SET `factory` = LOWER(`factory`) WHERE `factory` IN ('IMCN', 'IMFT', 'IMAW');
UPDATE `inspectionrecord` SET `factory` = LOWER(`factory`) WHERE `factory` IN ('IMCN', 'IMFT', 'IMAW');

-- Seed default factory configuration
INSERT INTO `factory` (`code`, `name`, `color`, `sortOrder`, `isActive`, `updatedAt`)
VALUES
    ('imcn', 'IMCN', '#10b981', 0, true, CURRENT_TIMESTAMP(3)),
    ('imft', 'IMFT', '#8b5cf6', 1, true, CURRENT_TIMESTAMP(3)),
    ('imaw', 'IMAW', '#f59e0b', 2, true, CURRENT_TIMESTAMP(3)),
    ('职能部门', '职能部门', '#ec4899', 3, true, CURRENT_TIMESTAMP(3))
ON DUPLICATE KEY UPDATE `code` = VALUES(`code`);
