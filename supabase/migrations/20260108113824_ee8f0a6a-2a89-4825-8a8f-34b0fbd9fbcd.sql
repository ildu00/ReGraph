-- Create device type enum
CREATE TYPE public.device_type AS ENUM ('gpu', 'tpu', 'npu', 'cpu', 'smartphone');

-- Create device status enum
CREATE TYPE public.device_status AS ENUM ('pending', 'online', 'offline', 'maintenance');

-- Create provider profiles table
CREATE TABLE public.provider_profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    company_name TEXT,
    payout_address TEXT,
    total_earnings DECIMAL(12, 6) NOT NULL DEFAULT 0,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on provider_profiles
ALTER TABLE public.provider_profiles ENABLE ROW LEVEL SECURITY;

-- Provider profiles policies
CREATE POLICY "Users can view their own provider profile" 
ON public.provider_profiles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own provider profile" 
ON public.provider_profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own provider profile" 
ON public.provider_profiles FOR UPDATE 
USING (auth.uid() = user_id);

-- Create provider devices table
CREATE TABLE public.provider_devices (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    device_name TEXT NOT NULL,
    device_type public.device_type NOT NULL,
    device_model TEXT,
    vram_gb INTEGER,
    price_per_hour DECIMAL(10, 4) NOT NULL DEFAULT 0.10,
    status public.device_status NOT NULL DEFAULT 'pending',
    connection_key TEXT,
    last_seen_at TIMESTAMP WITH TIME ZONE,
    total_compute_hours DECIMAL(10, 2) NOT NULL DEFAULT 0,
    total_earnings DECIMAL(12, 6) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on provider_devices
ALTER TABLE public.provider_devices ENABLE ROW LEVEL SECURITY;

-- Provider devices policies
CREATE POLICY "Users can view their own devices" 
ON public.provider_devices FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own devices" 
ON public.provider_devices FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own devices" 
ON public.provider_devices FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own devices" 
ON public.provider_devices FOR DELETE 
USING (auth.uid() = user_id);

-- Add updated_at triggers
CREATE TRIGGER update_provider_profiles_updated_at
    BEFORE UPDATE ON public.provider_profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_provider_devices_updated_at
    BEFORE UPDATE ON public.provider_devices
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();