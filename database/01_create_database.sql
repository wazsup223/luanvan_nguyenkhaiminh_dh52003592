-- =============================================
-- STEP 1: CREATE DATABASE (Run this FIRST)
-- =============================================

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS fastfood_multibranch
    CHARACTER SET utf8mb4 
    COLLATE utf8mb4_unicode_ci;

-- Grant all privileges to root user (for WAMP default setup)
GRANT ALL PRIVILEGES ON fastfood_multibranch.* TO 'root'@'localhost';

-- If you want to allow root from any host (optional, for development only)
-- GRANT ALL PRIVILEGES ON fastfood_multibranch.* TO 'root'@'%';

-- Flush privileges to apply changes
FLUSH PRIVILEGES;

-- Use the database
USE fastfood_multibranch;

-- Verify database was created
SHOW DATABASES LIKE 'fastfood_multibranch';

-- Show current user privileges
SHOW GRANTS FOR 'root'@'localhost';
