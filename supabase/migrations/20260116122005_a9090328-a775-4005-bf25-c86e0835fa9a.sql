
-- Create test_users table for admin demo purposes
CREATE TABLE public.test_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name TEXT NOT NULL,
  email TEXT NOT NULL,
  balance_usd NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'active'
);

-- Enable RLS
ALTER TABLE public.test_users ENABLE ROW LEVEL SECURITY;

-- Only admins can view test users
CREATE POLICY "Admins can view test users"
ON public.test_users
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Insert 450 test users
DO $$
DECLARE
  i INTEGER;
  balance NUMERIC;
  first_names TEXT[] := ARRAY['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen', 'Christopher', 'Lisa', 'Daniel', 'Nancy', 'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra', 'Donald', 'Ashley', 'Steven', 'Kimberly', 'Paul', 'Emily', 'Andrew', 'Donna', 'Joshua', 'Michelle', 'Kenneth', 'Dorothy', 'Kevin', 'Carol', 'Brian', 'Amanda', 'George', 'Melissa', 'Timothy', 'Deborah', 'Alex', 'Emma', 'Oliver', 'Sophia', 'Liam', 'Ava', 'Noah', 'Isabella', 'Ethan', 'Mia'];
  last_names TEXT[] := ARRAY['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts'];
  domains TEXT[] := ARRAY['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'proton.me', 'mail.com'];
  fname TEXT;
  lname TEXT;
  statuses TEXT[] := ARRAY['active', 'active', 'active', 'active', 'inactive'];
BEGIN
  FOR i IN 1..450 LOOP
    fname := first_names[1 + floor(random() * array_length(first_names, 1))::int];
    lname := last_names[1 + floor(random() * array_length(last_names, 1))::int];
    
    IF i <= 225 THEN
      balance := 0;
    ELSE
      balance := 10 + floor(random() * 2991)::numeric;
    END IF;
    
    INSERT INTO test_users (display_name, email, balance_usd, status)
    VALUES (
      fname || ' ' || lname,
      lower(fname) || '.' || lower(lname) || i::text || '@' || domains[1 + floor(random() * array_length(domains, 1))::int],
      balance,
      statuses[1 + floor(random() * array_length(statuses, 1))::int]
    );
  END LOOP;
END $$;
