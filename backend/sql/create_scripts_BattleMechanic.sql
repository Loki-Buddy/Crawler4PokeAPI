DROP SCHEMA IF EXISTS "BattleMechanic" CASCADE;
CREATE SCHEMA "BattleMechanic" AUTHORIZATION postgres;

SET search_path TO "BattleMechanic";

--DROP TABLE IF EXISTS species;
--DROP TABLE IF EXISTS pokemon_stat;
--DROP TABLE IF EXISTS stat;
--DROP TABLE IF EXISTS pokemon_typ;
--DROP TABLE IF EXISTS typ;
--DROP TABLE IF EXISTS pokemon;

-- Alle Monster
CREATE TABLE pokemon (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
	front_sprites BYTEA, -- Download
	back_sprites BYTEA -- Download
);

-- Alle Typen
CREATE TABLE typ (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

-- Hilstabelle Pokemon <-> Typen
CREATE TABLE pokemon_typ (
    pokemon_id INTEGER REFERENCES pokemon(id),
    typ_id INTEGER REFERENCES typ(id),
    typ_slot INTEGER, -- 1 = Haupttyp, 2 = Zweittyp
	weekness_slot INTEGER, -- 1 = 1.Weekness, 2 = 2.Weekness ... usw.
    PRIMARY KEY (pokemon_id, typ_id)
);

-- Alle Stats (HP, Attack, Defense und Speed)
CREATE TABLE stat (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

-- Hilfstabelle Pokémon <-> Stats
CREATE TABLE pokemon_stat (
    pokemon_id INTEGER REFERENCES pokemon(id),
    stat_id INTEGER REFERENCES stat(id),
    base_stat INTEGER,
    PRIMARY KEY (pokemon_id, stat_id)
);

-- Alle Moves
-- (insert WHERE learned_by_pokemon => pokemon_id <= 151)
-- move-category 0,1 und 4 (damage, ailment, damage+ailment)
CREATE TABLE moves(
	id SERIAL PRIMARY KEY,
	name TEXT NOT NULL UNIQUE,
	move_category TEXT,
	accuracy INTEGER,
	effect_chance INTEGER,
	flavor_text TEXT
);

-- Hilfstabelle Pokemon <-> Moves
CREATE TABLE pokemon_moves (
	pokemon_id INTEGER REFERENCES pokemon(id),
	move_id INTEGER REFERENCES moves(id),
	PRIMARY KEY (pokemon_id, move_id)
);

-- Hilfstabelle Damage-Realtions
CREATE TABLE dmg_relationen (
    attacker_typ_id INTEGER REFERENCES typ(id),
    defender_typ_id INTEGER REFERENCES typ(id),
    damage_factor REAL CHECK (damage_factor IN (0.0, 0.5, 1.0, 2.0)),
    PRIMARY KEY (attacker_typ_id, defender_typ_id)
);