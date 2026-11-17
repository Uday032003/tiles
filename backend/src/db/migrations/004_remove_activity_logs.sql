-- Migration 004: Remove activity_logs table and indexes

DROP TABLE IF EXISTS activity_logs CASCADE;

