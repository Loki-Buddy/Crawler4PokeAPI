DROP SCHEMA IF EXISTS "Pokedex" CASCADE;
CREATE SCHEMA "Pokedex" AUTHORIZATION postgres;

SET search_path TO "Pokedex";

CREATE TABLE pokemon(
	id SERIAL PRIMARY KEY,
	name TEXT NOT NULL UNIQUE,
	height REAL,
	weight REAL,
	flavor_text TEXT,
	front_sprites TEXT NOT NULL
);

CREATE TABLE typ (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

-- Hilstabelle Pokemon <-> Typen
CREATE TABLE pokemon_typ (
    pokemon_id INTEGER REFERENCES pokemon(id),
    typ_id INTEGER REFERENCES typ(id),
    slot INTEGER, -- 1 = Haupttyp, 2 = Zweittyp
    PRIMARY KEY (pokemon_id, typ_id)
);
