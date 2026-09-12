-- Travel dashboard database. Apply once to a new Supabase project.
-- No passwords, service keys, or editor emails belong in this file.
begin;
create table public.travel_editors (
 email text primary key check (email = lower(email))
);
alter table public.travel_editors enable row level security;
revoke all on public.travel_editors from anon, authenticated;
grant select on public.travel_editors to authenticated;
create policy own_editor_record on public.travel_editors for select to authenticated
 using (email = lower((select auth.jwt()->>'email')) and (select auth.uid()) is not null and coalesce((select auth.jwt()->>'is_anonymous'),'false') = 'false');

create table public.travel_trips (
 id text primary key check(id ~ '^[a-z0-9-]+$'),
 name text not null,
 start_date date not null,
 end_date date not null check(end_date >= start_date),
 status text not null check(status in ('Potential','Planning','Booked','Completed')),
 tentative boolean not null default false
);
create table public.travel_activities (
 id uuid primary key default gen_random_uuid(),
 trip_id text not null references public.travel_trips(id),
 activity_date date not null,
 activity_time time,
 title text not null check(length(trim(title)) between 1 and 200),
 location text not null default '' check(length(location)<=300),
 notes text not null default '' check(length(notes)<=4000),
 version integer not null default 1,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index travel_activities_trip_date on public.travel_activities(trip_id, activity_date, activity_time);
create table public.travel_sections (
 trip_id text not null references public.travel_trips(id),
 section text not null check(section in ('participants','accommodations','pws')),
 data jsonb not null,
 primary key (trip_id,section)
);
create function public.validate_travel_activity() returns trigger language plpgsql security invoker set search_path = '' as $$
begin
 if not exists (select 1 from public.travel_trips t where t.id=new.trip_id and new.activity_date between t.start_date and t.end_date) then
  raise exception 'Activity date must be within the trip dates';
 end if;
 if TG_OP='UPDATE' then
  new.version=old.version+1;
  new.updated_at=now();
 end if;
 return new;
end $$;
revoke all on function public.validate_travel_activity() from public, anon, authenticated;
create trigger validate_activity before insert or update on public.travel_activities for each row execute function public.validate_travel_activity();

alter table public.travel_trips enable row level security;
alter table public.travel_activities enable row level security;
alter table public.travel_sections enable row level security;
revoke all on public.travel_trips,public.travel_activities,public.travel_sections from anon,authenticated;
grant select on public.travel_trips,public.travel_sections to authenticated;
grant select,insert,update,delete on public.travel_activities to authenticated;
create policy editors_read_trips on public.travel_trips for select to authenticated using (exists(select 1 from public.travel_editors));
create policy editors_read_sections on public.travel_sections for select to authenticated using (exists(select 1 from public.travel_editors));
create policy editors_read_activities on public.travel_activities for select to authenticated using (exists(select 1 from public.travel_editors));
create policy editors_insert_activities on public.travel_activities for insert to authenticated with check (exists(select 1 from public.travel_editors));
create policy editors_update_activities on public.travel_activities for update to authenticated using (exists(select 1 from public.travel_editors)) with check (exists(select 1 from public.travel_editors));
create policy editors_delete_activities on public.travel_activities for delete to authenticated using (exists(select 1 from public.travel_editors));
insert into public.travel_trips values
 ('japan','Japan','2027-03-05','2027-03-14','Potential',true),
 ('yunnan','Yunnan','2027-05-14','2027-05-23','Planning',false);
insert into public.travel_sections values
 ('japan','participants','{"Listed for now":["Clay","Wendy"]}'),
 ('yunnan','participants','{"Confirmed":["Clay","Wendy"],"Unconfirmed":["Jon","Cindy","Babies","Helper"]}'),
 ('japan','accommodations','[]'),('yunnan','accommodations','[]'),
 ('yunnan','pws','{"arrangements":{"Shoot date & time":"To decide","Backup date":"To decide","Locations":"To shortlist","Photographer / studio":"To shortlist","Hair & makeup":"To arrange","Outfits & fittings":"To plan","Transport":"To arrange","Budget & currency":"To decide","Package, deposit & balance":"Not recorded","Photo delivery date":"To confirm"},"tasks":["Choose a mood board and must-have shots","Compare studios, packages, and photo deliverables","Confirm locations, access, and any permissions","Reserve the shoot date and a weather backup","Arrange outfits, fittings, hair, and makeup","Plan transport and time away from the group","Pack shoes, accessories, touch-up kit, and layers"],"notes":"No references added yet."}');
commit;

-- Supabase's optional automatic-RLS helper is an internal event trigger.
-- It does not need to be executable through the browser API.
do $$ begin
 if to_regprocedure('public.rls_auto_enable()') is not null then
  revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
 end if;
end $$;
