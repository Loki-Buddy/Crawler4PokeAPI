DROP SCHEMA IF EXISTS "BattleMechanic" CASCADE;
CREATE SCHEMA "BattleMechanic" AUTHORIZATION postgres;

SET search_path TO "BattleMechanic";

-- Alle Monster
CREATE TABLE pokemon (
    id SERIAL PRIMARY KEY,
    api_name TEXT NOT NULL,
    ger_name TEXT NOT NULL,
	front_sprite BYTEA, -- Download
	back_sprite BYTEA, -- Download
    cry_url TEXT,
    hp INTEGER,
    attack INTEGER,
    special_attack INTEGER,
    defense INTEGER,
    special_defense INTEGER,
    speed INTEGER
);

-- Alle Typen
CREATE TABLE typ (
    id SERIAL PRIMARY KEY,
    api_name TEXT NOT NULL UNIQUE,
    ger_name TEXT NOT NULL UNIQUE,
    dmg_relations JSONB
);

-- Hilstabelle Pokemon <-> Typen
CREATE TABLE pokemon_typ (
    pokemon_id INTEGER REFERENCES pokemon(id),
    typ_id INTEGER REFERENCES typ(id),
    slot INTEGER, -- 1 = Haupttyp, 2 = Zweittyp
    PRIMARY KEY (pokemon_id, typ_id)
);

--Hilfstabelle Pokemon_typ <-> Weekness_typ
CREATE TABLE pokemon_weak_strong_immune (
    id SERIAL,
    typ_id INTEGER REFERENCES typ(id),
    weak TEXT[],
    strong TEXT[],
    immune TEXT[],
    PRIMARY KEY (id, typ_id)
);

-- Alle Moves
-- (insert WHERE learned_by_pokemon => pokemon_id <= 151)
-- move-category 0,1 und 4 (damage, ailment, damage+ailment)
CREATE TABLE moves(
	id SERIAL PRIMARY KEY,
	api_name TEXT NOT NULL UNIQUE,
    ger_name TEXT NOT NULL UNIQUE,
    ailment TEXT,
    ailment_chance INTEGER,
    move_category TEXT,
    dmg_class TEXT,
    dmg_power INTEGER,
    dmg_typ TEXT,
    stat_changes JSONB,
    accuracy INTEGER,
    effect_chance INTEGER,
    pp INTEGER,
    flavor_text TEXT
);

-- Hilfstabelle Pokemon <-> Moves
CREATE TABLE pokemon_moves (
    id SERIAL,
	pokemon_id INTEGER REFERENCES pokemon(id),
	moves_arr INTEGER[],
    PRIMARY KEY (id, pokemon_id)
);