-- Summer Swing League 2026 — Database Setup
-- Run this in your Heroku Postgres dashboard (Dataclips or any SQL client).
-- Safe to run multiple times (uses IF NOT EXISTS).

-- ─────────────────────────────────────────────
-- MEMBERS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS members (
  id               TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  full_name        TEXT        NOT NULL,
  email            TEXT        NOT NULL UNIQUE,
  current_handicap NUMERIC(5,1) NOT NULL DEFAULT 0,
  is_active        BOOLEAN     NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- SCORES
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scores (
  id                    TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  member_id             TEXT        REFERENCES members(id) ON DELETE SET NULL,
  player_name           TEXT        NOT NULL,
  holes                 INTEGER     NOT NULL CHECK (holes IN (9, 18)),
  gross_score           INTEGER     NOT NULL,
  handicap_used         NUMERIC(5,1) NOT NULL,
  course_name           TEXT        NOT NULL,
  course_difficulty     TEXT        NOT NULL DEFAULT 'average'
                                    CHECK (course_difficulty IN ('easy', 'average', 'tough')),
  difficulty_multiplier NUMERIC(4,2) NOT NULL DEFAULT 1.00,
  group_member_ids      TEXT[]      NOT NULL DEFAULT '{}',
  group_member_names    TEXT        NOT NULL DEFAULT '',
  group_size            INTEGER     NOT NULL DEFAULT 1,
  base_points           NUMERIC(7,2),
  group_bonus           NUMERIC(5,1) NOT NULL DEFAULT 0,
  additional_points     NUMERIC(5,1) NOT NULL DEFAULT 0,
  total_points          NUMERIC(7,2),
  play_date             TIMESTAMPTZ NOT NULL,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- HANDICAP HISTORY
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS handicap_history (
  id          TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  member_id   TEXT        NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  handicap    NUMERIC(5,1) NOT NULL,
  score_id    TEXT        REFERENCES scores(id) ON DELETE SET NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_scores_member_id ON scores(member_id);
CREATE INDEX IF NOT EXISTS idx_scores_play_date ON scores(play_date DESC);
CREATE INDEX IF NOT EXISTS idx_hh_member_id     ON handicap_history(member_id);
