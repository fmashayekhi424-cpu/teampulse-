-- Shorter labels, an icon that actually reads as optics/physics for the KTH
-- lab, comments restricted to "Other" only, and "Attend Course" retired
-- (soft-deleted via is_active so any historical entries referencing it
-- still resolve fine).
update status_types set label = 'WFH' where key = 'wfh';
update status_types set label = 'Lab', icon = '🔭' where key = 'kth_lab';
update status_types set icon = '📝' where key = 'other';
update status_types set allows_comment = false where key = 'teaching';
update status_types set is_active = false where key = 'course';
