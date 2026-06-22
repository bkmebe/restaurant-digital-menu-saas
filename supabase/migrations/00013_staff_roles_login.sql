-- Add kitchen_staff and inventory_manager to user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'kitchen_staff';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'inventory_manager';
