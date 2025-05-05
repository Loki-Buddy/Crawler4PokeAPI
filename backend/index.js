import Pokedex from 'pokedex-promise-v2';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Verbindung zur Datenbank herstellen
const pool = new Pool(
    {
        user: process.env.DB_USER, // Dein PostgreSQL-Benutzername
        host: process.env.DB_HOST, // z. B. 'localhost'
        database: process.env.DB_NAME, // Name deiner Datenbank
        password: process.env.DB_PASSWORD, // Dein Passwort
        port: process.env.DB_PORT, // Standardport für PostgreSQL
    }
);

// Pokedex-API initialisieren
const P = new Pokedex();

// die Tabelle Pokedex.pokemon mit den Daten der Pokémon-API befuellen
(async () => {
    try {
        const interval = { limit: 1, offset: 0 };
        P.getPokemonsList(interval) // alle Pokémon abrufen
            .then(async (response) => {
                // die Daten der Pokémon in die Tabelle schreiben
                for (let i = 0; i < 1; i++) {
                    //  Fetch auf die Species um auf die Namen und die Beschreibung in deutscher Sprache zu kommen
                    const original = await P.getPokemonSpeciesByName(response.results[i].name);
                    const ger = original.names.filter((pokeAPIName) => pokeAPIName.language.name === 'de')[0].name;

                    // Zugriff auf den Flavor_Text um auf die Beschreibung in deutscher Sprache zu kommen
                    const german_flavor_text =
                        original.flavor_text_entries.filter((flavor_text) => flavor_text.language.name === 'de')[0].flavor_text;

                    // Formatierung der Beschreibung
                    const cleanedFlavorText = german_flavor_text.replace(/\n/g, ' ').trim();

                    // Fetch auf die Pokémon um weitere Deatils abzufragen
                    const pokemon = await P.getPokemonByName(response.results[i].name);
                    const front_sprites_url = pokemon.sprites.front_default;
                    const height = pokemon.height / 10;
                    const weight = pokemon.weight / 10;


                    // Daten in die Tabelle schreiben
                    const client = await pool.connect(); // Verbindung zur Datenbank herstellen
                    try {
                        // Setzt den Schema auf "Pokedex"
                        await client.query('SET search_path TO "Pokedex";');

                        // INSERT Befehl um die Daten in die Tabelle zu schreiben
                        await client.query(
                            `INSERT INTO pokemon (name, height, weight, flavor_text, front_sprites)
                            VALUES ($1, $2, $3, $4, $5);`,
                            [ger, height, weight, cleanedFlavorText, front_sprites_url]);

                    } catch (error) {
                        console.error('Fehler beim Abrufen der Pokémon-Daten:', error);
                    } finally {
                        // Verbindung zur Datenbank schliessen bzw freigeben
                        client.release();
                    }
                }
            });
    } catch (error) {
        console.error('Fehler beim Abrufen der Pokémon-Daten:', error);
    }
})();

(async () => {
    try {
        P.getTypesList({ limit: 16, offset: 0 })
            .then(async (response) => {
                console.log(response);
                for (let i = 0; i < 16; i++) {
                    const typ = response.results[i].name;
                    

                    if (response.results[i].name === 'steel' || response.results[i].name === 'ice') {
                        continue;
                    }

                    P.getTypeByName(typ)
                        .then((response) => {
                            const german_name = response.names.filter((german_name) => german_name.language.name === 'de')[0].name;
                            return german_name;
                        })
                        .then(async (ger_Typname) => {
                            const client = await pool.connect();
                            try {
                                await client.query('SET search_path TO "Pokedex";');
                                await client.query(`INSERT INTO typ (name) VALUES ($1);`, [ger_Typname]);
                            } catch (error) {
                                console.error('Fehler beim Abrufen der Pokémon-Daten:', error);
                            } finally {
                                client.release();
                            }
                        });
                }
            });
    } catch (error) {
        console.error('Fehler beim Abrufen der Pokémon-Daten:', error);
    }
})();