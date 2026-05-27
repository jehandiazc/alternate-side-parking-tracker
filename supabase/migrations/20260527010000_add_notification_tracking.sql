-- Add notification-sent tracking columns to parking_logs.
-- These prevent the cron job from sending duplicate alerts for the same log.

alter table parking_logs
  add column notified_night_before boolean not null default false,
  add column notified_two_hours    boolean not null default false;
