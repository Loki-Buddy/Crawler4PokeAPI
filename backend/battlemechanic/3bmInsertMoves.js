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

(async () => {
    try {
        const response = await P.getMovesList({ limit: 937, offset: 0 }); // Abrufen der Move-Liste

        for (let i = 0; i < 937; i++) {

            const api_name = response.results[i].name; // Name des Moves aus der API
            const moveDetails = await P.getMoveByName(api_name); // Abrufen der Move-Details

            const learned_by_Pokemon = moveDetails.learned_by_pokemon;

            if (learned_by_Pokemon.length === 0) {
                continue;
            }

            if (moveDetails.id > 163) {
                break;
            }

            const pokemon_firstIndex = await P.getPokemonByName(learned_by_Pokemon[0].name);

            if ((pokemon_firstIndex.id < 152 && moveDetails.generation.name === 'generation-i') && (moveDetails.meta.category.name.includes('damage') || moveDetails.meta.category.name.includes('ailment') || moveDetails.meta.category.name.includes('net-good-stats'))) {
                const ger_name = moveDetails.names.filter((pokeAPIName) => pokeAPIName.language.name === 'de')[0].name; // Deutscher Name des Moves
                const german_flavor_text = moveDetails.flavor_text_entries.filter((flavor_text) => flavor_text.language.name === 'de')[0].flavor_text; // Deutscher Flavor-Text des Moves
                const client = await pool.connect(); // Verbindung zur Datenbank herstellen
                try {
                    await client.query('SET search_path TO "BattleMechanic";'); // Setzen des Schemas
                    // Einfügen der Move-Daten in die Datenbank
                    await client.query(
                        `INSERT INTO moves (api_name, ger_name, ailment, ailment_chance, move_category, dmg_class, dmg_power, dmg_typ, stat_changes, accuracy, effect_chance, pp, flavor_text)
                                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13);`,
                        [
                            api_name,
                            ger_name,
                            moveDetails.meta.ailment.name,
                            moveDetails.meta.ailment_chance,
                            moveDetails.meta.category.name,
                            moveDetails.damage_class.name,
                            moveDetails.power,
                            moveDetails.type.name,
                            JSON.stringify(moveDetails.stat_changes),
                            moveDetails.accuracy,
                            moveDetails.effect_chance,
                            moveDetails.pp,
                            german_flavor_text
                        ]
                    );

                    console.log('Move wurder erfolgreich hinzugefügt: ' + ger_name + ' ' + moveDetails.id);

                    //await sleep(500);
                } catch (error) {
                    console.error('Fehler beim Abrufen der Pokémon-Daten:', error); // Fehlerbehandlung
                } finally {
                    client.release(); // Freigeben der Datenbankverbindung
                }
            }
        }

        const client = await pool.connect(); // Verbindung zur Datenbank herstellen
        try {
            const moveDetails = await P.getMoveByName('transform');
            const ger_name = moveDetails.names.filter((pokeAPIName) => pokeAPIName.language.name === 'de')[0].name;
            const german_flavor_text = moveDetails.flavor_text_entries.filter((flavor_text) => flavor_text.language.name === 'de')[0].flavor_text;

            await client.query('SET search_path TO "BattleMechanic";'); // Setzen des Schemas
            // Einfügen der Move-Daten in die Datenbank
            await client.query(
                `INSERT INTO moves (api_name, ger_name, ailment, ailment_chance, move_category, dmg_class, dmg_power, dmg_typ, stat_changes, accuracy, effect_chance, pp, flavor_text)
                                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13);`,
                [
                    moveDetails.name,
                    ger_name,
                    moveDetails.meta.ailment.name,
                    moveDetails.meta.ailment_chance,
                    moveDetails.meta.category.name,
                    moveDetails.damage_class.name,
                    moveDetails.power,
                    moveDetails.type.name,
                    JSON.stringify(moveDetails.stat_changes),
                    moveDetails.accuracy,
                    moveDetails.effect_chance,
                    moveDetails.pp,
                    german_flavor_text
                ]
            );

        } catch (error) {
            console.error('Fehler beim Abrufen der Pokémon-Daten:', error); // Fehlerbehandlung
        } finally {
            client.release(); // Freigeben der Datenbankverbindung
        }
    } catch (error) {
        console.error('Fehler beim Abrufen der Pokémon-Daten!', error); // Fehlerbehandlung
    }
})();