import Pokedex from 'pokedex-promise-v2';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Konfiguration des PostgreSQL-Pools mit Umgebungsvariablen
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT
});

const P = new Pokedex(); // Initialisierung der Pokedex-API
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)); // Hilfsfunktion für Verzögerungen

// Abrufen und Speichern der Pokémon-Daten
(async () => {
    try {
        const interval = { limit: 151, offset: 0 }; // Definieren des Bereichs für die ersten 151 Pokémon
        const allPokemon = await P.getPokemonsList(interval); // Abrufen der Pokémon-Liste
        for (let i = 0; i < 151; i++) {
            // Abrufen der Spezies-Daten eines Pokémon
            const original = await P.getPokemonSpeciesByName(allPokemon.results[i].name);
            const ger = original.names.filter((pokeAPIName) => pokeAPIName.language.name === 'de')[0].name; // Deutscher Name des Pokémon

            // Abrufen und Bereinigen des deutschen Flavor-Texts
            const german_flavor_text =
                original.flavor_text_entries.filter((flavor_text) => flavor_text.language.name === 'de')[0].flavor_text;
            const cleanedFlavorText = german_flavor_text.replace(/\n/g, ' ').trim();

            // Abrufen der Basisdaten eines Pokémon
            const pokemon = await P.getPokemonByName(allPokemon.results[i].name);
            const front_sprites_url = pokemon.sprites.front_default; // URL des Front-Sprites
            const height = pokemon.height / 10; // Höhe in Metern
            const weight = pokemon.weight / 10; // Gewicht in Kilogramm

            const client = await pool.connect(); // Verbindung zur Datenbank herstellen
            try {
                await client.query('SET search_path TO "Pokedex";'); // Setzen des Schemas
                // Einfügen der Pokémon-Daten in die Datenbank
                await client.query(
                    `INSERT INTO pokemon (api_name, ger_name, height, weight, flavor_text, front_sprites)
                            VALUES ($1, $2, $3, $4, $5, $6);`,
                    [allPokemon.results[i].name, ger, height, weight, cleanedFlavorText, front_sprites_url]
                );
            } catch (error) {
                console.error('Fehler beim Abrufen der Pokémon-Daten:', error); // Fehlerbehandlung
            } finally {
                client.release(); // Freigeben der Datenbankverbindung
            }
        }
    } catch (error) {
        console.error('Fehler beim Abrufen der Pokémon-Daten:', error); // Fehlerbehandlung
    }
})();

// Verzögerung, um der Datenbank Zeit zu geben die Daten abzuspeichern
await sleep(5000);

// Abrufen und Speichern der Pokémon-Typen
(async () => {
    try {
        const response = await P.getTypesList({ limit: 18, offset: 0 }); // Abrufen der Typen-Liste
        for (let i = 0; i < 18; i++) {
            const api_typ = response.results[i].name; // Name des Typs aus der API

            if (api_typ === 'dark') {
                continue; // Überspringen des Typs "dark"
            }

            const typeDetails = await P.getTypeByName(api_typ); // Abrufen der Typdetails
            const ger_typ = typeDetails.names.filter((pokeAPIName) => pokeAPIName.language.name === 'de')[0].name; // Deutscher Name des Typs

            const client = await pool.connect(); // Verbindung zur Datenbank herstellen
            try {
                await client.query('SET search_path TO "Pokedex";'); // Setzen des Schemas
                // Einfügen der Typ-Daten in die Datenbank
                await client.query(`INSERT INTO typ (api_name, ger_name) VALUES ($1, $2);`, [api_typ, ger_typ]);
            } catch (error) {
                console.error('Fehler beim Abrufen der Pokémon-Daten:', error); // Fehlerbehandlung
            } finally {
                client.release(); // Freigeben der Datenbankverbindung
            }

            await sleep(1000); // Verzögerung zwischen API-Anfragen
        }
    } catch (error) {
        console.error('Fehler beim Abrufen der Pokémon-Daten:', error); // Fehlerbehandlung
    }
})();

// Verzögerung, um der Datenbank Zeit zu geben die Daten abzuspeichern
await sleep(10000);

// Verknüpfen der Pokémon mit ihren Typen
(async () => {
    try {
        const allPokemon = await P.getPokemonsList({ limit: 151, offset: 0 }); // Abrufen der Pokémon-Liste
        const client = await pool.connect(); // Verbindung zur Datenbank herstellen
        try {
            await client.query(`SET search_path TO "Pokedex";`); // Setzen des Schemas
            const resultTyp = await client.query(`SELECT * FROM typ`); // Abrufen aller Typen aus der Datenbank

            for (let i = 0; i < 151; i++) {
                const pokemon = await P.getPokemonByName(allPokemon.results[i].name); // Abrufen der Pokémon-Daten
                const api_typSlot1 = pokemon.types[0].type.name; // Erster Typ des Pokémon
                const api_typSlot2 = pokemon.types[1] ? pokemon.types[1].type.name : null; // Zweiter Typ (falls vorhanden)

                // Zuordnen der Typen aus der Datenbank
                const db_typSlot1 = resultTyp.rows.find((typ) => typ.api_name === api_typSlot1);
                const db_typSlot2 = api_typSlot2 ? resultTyp.rows.find((typ) => typ.api_name === api_typSlot2) : null;

                await sleep(1000); // Verzögerung zwischen API-Anfragen

                // Einfügen der Typ-Zuordnung in die Datenbank
                await client.query(`INSERT INTO pokemon_typ (pokemon_id, typ_id, slot) VALUES ($1, $2, $3);`, [i + 1, db_typSlot1.id, 1]); //Ohne den sleep funktioniert das nicht

                if (db_typSlot2) {
                    await client.query(`INSERT INTO pokemon_typ (pokemon_id, typ_id, slot) VALUES ($1, $2 , $3);`, [i + 1, db_typSlot2.id, 2]);
                }
            }
        } catch (error) {
            console.error('Fehler beim Abrufen der Pokémon-Daten:', error); // Fehlerbehandlung
        } finally {
            client.release(); // Freigeben der Datenbankverbindung
        }
    } catch (error) {
        console.error('Fehler beim Abrufen der Pokémon-Daten:', error); // Fehlerbehandlung
    }
})();