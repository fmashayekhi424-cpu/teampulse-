-- Global status types (team_id null), available to every team.
-- Office is deliberately sort_order 0 and never needs a schedule_entries row
-- — it's the implicit default for any day nothing else was chosen for.
insert into status_types (key, label, icon, color, allows_comment, sort_order) values
  ('office',    'Office',           '🟢', '#16a34a', false, 0),
  ('wfh',       'Work From Home',   '🏠', '#0ea5e9', false, 1),
  ('kth_lab',   'KTH Lab',          '🧪', '#8b5cf6', false, 2),
  ('ki_lab',    'KI',               '🏥', '#14b8a6', false, 3),
  ('course',    'Attend Course',    '🎓', '#f59e0b', true,  4),
  ('teaching',  'Teaching',         '👩‍🏫', '#6366f1', true,  5),
  ('sick',      'Sick',             '🤒', '#ef4444', false, 6),
  ('vacation',  'Vacation',         '🏖', '#f472b6', false, 7),
  ('other',     'Other',            '📍', '#6b7280', true,  8);
