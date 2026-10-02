CREATE TABLE public.access_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  duration text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  activated_at timestamptz,
  expires_at timestamptz,
  revoked boolean NOT NULL DEFAULT false
);
GRANT ALL ON public.access_keys TO service_role;
ALTER TABLE public.access_keys ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.saved_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_id uuid NOT NULL REFERENCES public.access_keys(id) ON DELETE CASCADE,
  name text NOT NULL,
  data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.saved_profiles TO service_role;
ALTER TABLE public.saved_profiles ENABLE ROW LEVEL SECURITY;
CREATE INDEX saved_profiles_key_idx ON public.saved_profiles(key_id);