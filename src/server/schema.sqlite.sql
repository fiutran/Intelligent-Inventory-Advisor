-- SQLite schema (mirrors src/db/schema.sql)

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS user (
  user_id     INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS category (
  category_id INTEGER PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  icon        TEXT
);

CREATE TABLE IF NOT EXISTS preference_weight (
  user_id         INTEGER NOT NULL REFERENCES user(user_id) ON DELETE CASCADE,
  attribute       TEXT NOT NULL,
  weight          REAL NOT NULL DEFAULT 0,
  evidence_count  INTEGER NOT NULL DEFAULT 0,
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, attribute)
);

CREATE TABLE IF NOT EXISTS keyword (
  keyword_id   INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id  INTEGER NOT NULL REFERENCES category(category_id) ON DELETE CASCADE,
  word         TEXT NOT NULL,
  source       TEXT NOT NULL DEFAULT 'seed',
  UNIQUE (category_id, word)
);

CREATE TABLE IF NOT EXISTS inventory_item (
  item_id       INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL REFERENCES user(user_id) ON DELETE CASCADE,
  category_id   INTEGER NOT NULL REFERENCES category(category_id),
  brand         TEXT,
  model         TEXT NOT NULL,
  summary       TEXT,
  icon          TEXT,
  price         REAL,
  release_year  INTEGER,
  specs         TEXT NOT NULL DEFAULT '[]',
  provenance    TEXT NOT NULL DEFAULT 'manual'
                CHECK (provenance IN ('receipt', 'photo', 'manual')),
  confidence    TEXT CHECK (confidence IS NULL OR confidence IN ('high', 'medium', 'low')),
  status        TEXT NOT NULL DEFAULT 'owned'
                CHECK (status IN ('owned', 'retired', 'considering', 'sold')),
  acquired_at   TEXT
);

CREATE TABLE IF NOT EXISTS product_cache (
  product_key     TEXT PRIMARY KEY,
  category_id     INTEGER NOT NULL REFERENCES category(category_id),
  brand           TEXT,
  model           TEXT NOT NULL,
  summary         TEXT,
  icon            TEXT,
  price           REAL,
  specs           TEXT NOT NULL DEFAULT '[]',
  source          TEXT NOT NULL,
  researched_at   TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at      TEXT
);

CREATE TABLE IF NOT EXISTS product_alias (
  alias_id      INTEGER PRIMARY KEY AUTOINCREMENT,
  product_key   TEXT NOT NULL REFERENCES product_cache(product_key) ON DELETE CASCADE,
  alias         TEXT NOT NULL UNIQUE,
  source        TEXT NOT NULL DEFAULT 'seed'
);

CREATE TABLE IF NOT EXISTS decision (
  decision_id             INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id                 INTEGER NOT NULL REFERENCES user(user_id) ON DELETE CASCADE,
  category_id             INTEGER REFERENCES category(category_id),
  query                   TEXT NOT NULL,
  branch                  TEXT NOT NULL,
  matched_item_id         INTEGER REFERENCES inventory_item(item_id) ON DELETE SET NULL,
  verdict                 TEXT NOT NULL,
  stated_price            REAL,
  payload                 TEXT NOT NULL DEFAULT '{}',
  bought_against_advice   INTEGER NOT NULL DEFAULT 0,
  retired_item_id         INTEGER REFERENCES inventory_item(item_id) ON DELETE SET NULL,
  chosen_product_key      TEXT REFERENCES product_cache(product_key) ON DELETE SET NULL,
  purchased               INTEGER,
  created_at              TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS recommendation_option (
  option_id     INTEGER PRIMARY KEY AUTOINCREMENT,
  decision_id   INTEGER NOT NULL REFERENCES decision(decision_id) ON DELETE CASCADE,
  product_key   TEXT NOT NULL REFERENCES product_cache(product_key),
  was_chosen    INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS inventory_item_user_idx ON inventory_item (user_id);
CREATE INDEX IF NOT EXISTS inventory_item_user_cat_idx ON inventory_item (user_id, category_id);
CREATE INDEX IF NOT EXISTS inventory_item_status_idx ON inventory_item (user_id, status);
CREATE INDEX IF NOT EXISTS keyword_word_idx ON keyword (word);
CREATE INDEX IF NOT EXISTS product_alias_alias_idx ON product_alias (alias);
CREATE INDEX IF NOT EXISTS decision_user_idx ON decision (user_id, created_at);
