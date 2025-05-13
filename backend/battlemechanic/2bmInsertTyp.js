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
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function replaceUrlWithMath(key, arr) {
    return arr.map(obj => {
        switch (key) {
            case 'double_damage_from':
                return {
                    name: obj.name,
                    math: 2.0
                };
            case 'double_damage_to':
                return {
                    name: obj.name,
                    math: 2.0
                };
            case 'half_damage_from':
                return {
                    name: obj.name,
                    math: 0.5
                };
            case 'half_damage_to':
                return {
                    name: obj.name,
                    math: 0.5
                };
            case 'no_damage_from':
                return {
                    name: obj.name,
                    math: 0.0
                };
            case 'no_damage_to':
                return {
                    name: obj.name,
                    math: 0.0
                };
        };
    });
}

// Abrufen und Speichern der Pokémon-Typen
(async () => {
    try {
        const response = await P.getTypesList({ limit: 18, offset: 0 }); // Abrufen der Typen-Liste
        for (let i = 0; i < 18; i++) {
            const api_typ = response.results[i].name; // Name des Typs aus der API

            if (api_typ === 'dark') {
                console.log('Der Typ Dark wurde übersprungen!');
                continue;
            }

            const typeDetails = await P.getTypeByName(api_typ); // Abrufen der Typdetails
            const ger_typ = typeDetails.names.filter((pokeAPIName) => pokeAPIName.language.name === 'de')[0].name; // Deutscher Name des Typs
            const dmg_relations = typeDetails.damage_relations;
            const keys = Object.keys(dmg_relations);

            const newDmgRelations = {
                double_damage_from: replaceUrlWithMath(keys[0], dmg_relations.double_damage_from),
                double_damage_to: replaceUrlWithMath(keys[1], dmg_relations.double_damage_to),
                half_damage_from: replaceUrlWithMath(keys[2], dmg_relations.half_damage_from),
                half_damage_to: replaceUrlWithMath(keys[3], dmg_relations.half_damage_to),
                no_damage_from: replaceUrlWithMath(keys[4], dmg_relations.no_damage_from),
                no_damage_to: replaceUrlWithMath(keys[5], dmg_relations.no_damage_to)
            };

            const client = await pool.connect(); // Verbindung zur Datenbank herstellen
            try {
                await client.query('SET search_path TO "BattleMechanic";'); // Setzen des Schemas
                // Einfügen der Typ-Daten in die Datenbank
                await client.query(`INSERT INTO typ (api_name, ger_name, dmg_relations) VALUES ($1, $2, $3);`, [api_typ, ger_typ, JSON.stringify(newDmgRelations)]);

                console.log('Der Typ wurde erfolgreich gespeichert! Name: ' + ger_typ);
            } catch (error) {
                console.error('Fehler beim Abrufen der Pokémon-Daten:', error); // Fehlerbehandlung
            } finally {
                client.release(); // Freigeben der Datenbankverbindung
            }

            await sleep(500); // Verzögerung zwischen API-Anfragen
        }
    } catch (error) {
        console.error('Fehler beim Abrufen der Pokémon-Daten für die Tabelle "typ":', error); // Fehlerbehandlung
    }
})();

// Verzögerung, um der Datenbank Zeit zu geben die Daten abzuspeichern und um die API nicht zu überlassten
await sleep(20000);

// Verknüpfen der Pokémon mit ihren Typen
(async () => {
    try {
        const allPokemon = await P.getPokemonsList({ limit: 151, offset: 0 }); // Abrufen der Pokémon-Liste
        const client = await pool.connect(); // Verbindung zur Datenbank herstellen
        try {
            await client.query(`SET search_path TO "BattleMechanic";`); // Setzen des Schemas
            const resultTyp = await client.query(`SELECT * FROM typ`); // Abrufen aller Typen aus der Datenbank

            for (let i = 0; i < 151; i++) {
                const pokemon = await P.getPokemonByName(allPokemon.results[i].name); // Abrufen der Pokémon-Daten
                const api_typSlot1 = pokemon.types[0].type.name; // Erster Typ des Pokémon
                const api_typSlot2 = pokemon.types[1] ? pokemon.types[1].type.name : null; // Zweiter Typ (falls vorhanden)

                // Zuordnen der Typen aus der Datenbank
                const db_typSlot1 = resultTyp.rows.find((typ) => typ.api_name === api_typSlot1);
                const db_typSlot2 = api_typSlot2 ? resultTyp.rows.find((typ) => typ.api_name === api_typSlot2) : null;

                await sleep(500); // Verzögerung zwischen API-Anfragen

                // Einfügen der Typ-Zuordnung in die Datenbank
                await client.query(`INSERT INTO pokemon_typ (pokemon_id, typ_id, slot) VALUES ($1, $2, $3);`, [i + 1, db_typSlot1.id, 1]); //Ohne den sleep funktioniert das nicht
                console.log('Der Typ wurde erfolgreich gespeichert! Typ Slot 1: ' + api_typSlot1 + ' Pokemon: ' + allPokemon.results[i].name);

                if (db_typSlot2) {
                    await client.query(`INSERT INTO pokemon_typ (pokemon_id, typ_id, slot) VALUES ($1, $2 , $3);`, [i + 1, db_typSlot2.id, 2]);
                    console.log('Der Typ wurde erfolgreich gespeichert! Typ Slot 2: ' + api_typSlot2 + ' Pokemon: ' + allPokemon.results[i].name);
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