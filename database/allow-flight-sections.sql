-- Already applied to the current Supabase project.
-- Upgrade an existing installation to store flights under the same RLS policies.
begin;
alter table public.travel_sections drop constraint travel_sections_section_check;
alter table public.travel_sections add constraint travel_sections_section_check check (section in ('participants','accommodations','pws','flights'));
commit;
