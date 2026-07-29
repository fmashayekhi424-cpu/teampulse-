-- Weekends and Swedish public holidays default to this instead of Office
-- (computed client/server-side in src/lib/swedish-holidays.ts — this row
-- just gives that default an icon, color, and a way to explicitly select
-- it, e.g. to mark a working Saturday back to normal or vice versa).
insert into status_types (key, label, icon, color, allows_comment, sort_order) values
  ('off', 'Day Off', '⬜', '#94a3b8', false, 100);
