-- Split each day into independent morning/afternoon slots. Existing rows
-- represented a whole day, so each one is duplicated into both periods
-- before the column becomes required — otherwise a historical "KTH Lab"
-- Tuesday would silently lose its afternoon half back to Office.

alter table schedule_entries add column period text;

-- Must drop the old (user_id, date) constraint before inserting the
-- "afternoon" duplicates — otherwise a duplicate row for a date that
-- already has an entry collides with it, since period doesn't factor
-- into uniqueness until the new constraint below replaces it.
alter table schedule_entries drop constraint schedule_entries_user_id_date_key;

insert into schedule_entries (user_id, date, status_type_id, comment, period)
select user_id, date, status_type_id, comment, 'afternoon'
from schedule_entries
where period is null;

update schedule_entries set period = 'morning' where period is null;

alter table schedule_entries alter column period set not null;
alter table schedule_entries add constraint schedule_entries_period_check
  check (period in ('morning', 'afternoon'));

alter table schedule_entries add constraint schedule_entries_user_date_period_key
  unique (user_id, date, period);
