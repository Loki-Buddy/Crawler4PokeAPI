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
        const interval = { limit: 151, offset: 0 };
        P.getPokemonsList(interval) // alle Pokémon abrufen
            .then(async (response) => {
                // die Daten der Pokémon in die Tabelle schreiben
                for (let i = 0; i < 151; i++) {
                    //  Fetch auf die Species um auf die Namen in deutscher Sprache zu kommen
                    const original = await P.getPokemonSpeciesByName(response.results[i].name);
                    const ger = original.names.filter((pokeAPIName) => pokeAPIName.language.name === 'de')[0].name;

                    // Fetch auf die Pokémon um die Sprites zu bekommen
                    const pokemon = await P.getPokemonByName(response.results[i].name);
                    const front_sprites_url = pokemon.sprites.front_default;

                    // Daten in die Tabelle schreiben
                    const client = await pool.connect(); // Verbindung zur Datenbank herstellen
                    try {
                        // Setzt den Schema auf "Pokedex"
                        await client.query('SET search_path TO "Pokedex";');

                        // INSERT Befehl um die Daten in die Tabelle zu schreiben
                        await client.query('INSERT INTO pokemon (name, front_sprites) VALUES ($1, $2);', [ger, front_sprites_url]);
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