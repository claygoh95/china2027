-- Upgrade existing databases to support private tour package quotes.
-- Applied to the hosted travel-dashboard database on 15 September 2026.
begin;
alter table public.travel_sections drop constraint travel_sections_section_check;
alter table public.travel_sections add constraint travel_sections_section_check
  check(section in ('participants','accommodations','pws','flights','tour_package'));
commit;
