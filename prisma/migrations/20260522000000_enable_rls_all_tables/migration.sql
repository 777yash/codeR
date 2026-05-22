-- Enable RLS on every table. No permissive policies = anon key gets nothing.
-- Prisma connects as postgres (BYPASSRLS) so app behavior is unchanged.

ALTER TABLE public.users                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_tokens  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_members         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_links          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public._prisma_migrations   ENABLE ROW LEVEL SECURITY;

-- Explicitly revoke from PostgREST roles
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;