-- Create enum for incident status
CREATE TYPE public.incident_status AS ENUM ('investigating', 'identified', 'monitoring', 'resolved');

-- Create enum for incident severity
CREATE TYPE public.incident_severity AS ENUM ('minor', 'major', 'critical');

-- Create incidents table
CREATE TABLE public.incidents (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status incident_status NOT NULL DEFAULT 'investigating',
    severity incident_severity NOT NULL DEFAULT 'minor',
    affected_services TEXT[] DEFAULT '{}',
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create incident updates table for tracking progress
CREATE TABLE public.incident_updates (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    status incident_status NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_updates ENABLE ROW LEVEL SECURITY;

-- Public read access for status page
CREATE POLICY "Anyone can view incidents"
ON public.incidents
FOR SELECT
USING (true);

CREATE POLICY "Anyone can view incident updates"
ON public.incident_updates
FOR SELECT
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_incidents_updated_at
BEFORE UPDATE ON public.incidents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_incidents_started_at ON public.incidents(started_at DESC);
CREATE INDEX idx_incident_updates_incident_id ON public.incident_updates(incident_id);