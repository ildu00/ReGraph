
-- Create claw_agents table
CREATE TABLE public.claw_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  emoji text NOT NULL DEFAULT '🤖',
  description text,
  system_prompt text NOT NULL DEFAULT '',
  model_id text NOT NULL DEFAULT 'gpt-5-mini',
  tools jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.claw_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own agents" ON public.claw_agents
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Create claw_conversations table
CREATE TABLE public.claw_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  agent_id uuid NOT NULL REFERENCES public.claw_agents(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'New Conversation',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.claw_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own conversations" ON public.claw_conversations
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Create claw_messages table
CREATE TABLE public.claw_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.claw_conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'tool')),
  content text,
  tool_name text,
  tool_input jsonb,
  tool_result jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.claw_messages ENABLE ROW LEVEL SECURITY;

-- RLS via conversation ownership
CREATE POLICY "Users can manage messages in their conversations" ON public.claw_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.claw_conversations c
      WHERE c.id = conversation_id AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.claw_conversations c
      WHERE c.id = conversation_id AND c.user_id = auth.uid()
    )
  );

-- Auto-update updated_at triggers
CREATE TRIGGER update_claw_agents_updated_at
  BEFORE UPDATE ON public.claw_agents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_claw_conversations_updated_at
  BEFORE UPDATE ON public.claw_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
