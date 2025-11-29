-- Step 1: Add 'pdv' role to app_role enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'pdv';