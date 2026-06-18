-- Update admin password
UPDATE users SET password_hash = '$2b$10$3f6sxHQdq5EMzyVsDeyQWuzJ9BuwNozQ8EwkMHfKnEiuKvINk1tZe' WHERE username = 'admin';
-- Also update manager accounts
UPDATE users SET password_hash = '$2b$10$3f6sxHQdq5EMzyVsDeyQWuzJ9BuwNozQ8EwkMHfKnEiuKvINk1tZe' WHERE username LIKE 'manager_%';
UPDATE users SET password_hash = '$2b$10$3f6sxHQdq5EMzyVsDeyQWuzJ9BuwNozQ8EwkMHfKnEiuKvINk1tZe' WHERE username LIKE 'cashier_%';
UPDATE users SET password_hash = '$2b$10$3f6sxHQdq5EMzyVsDeyQWuzJ9BuwNozQ8EwkMHfKnEiuKvINk1tZe' WHERE role IN ('Admin', 'BranchManager', 'Cashier', 'Kitchen', 'Waiter');