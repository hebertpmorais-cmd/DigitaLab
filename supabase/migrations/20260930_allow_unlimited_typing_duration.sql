-- Keep positive durations while allowing full-text practice beyond ten minutes.
ALTER TABLE public.typing_sessions DROP CONSTRAINT typing_sessions_duration_seconds_check;
ALTER TABLE public.typing_sessions ADD CONSTRAINT typing_sessions_duration_seconds_check CHECK (duration_seconds > 0);
