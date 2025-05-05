import Pokedex from 'pokedex-promise-v2';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool(
    {
        user: process.env.DB_USER, // Dein PostgreSQL-Benutzername
        host: process.env.DB_HOST, // z. B. 'localhost'
        database: process.env.DB_NAME, // Name deiner Datenbank
        password: process.env.DB_PASSWORD, // Dein Passwort
        port: process.env.DB_PORT, // Standardport für PostgreSQL
    }
);

const P = new Pokedex();

(async () => {
    try {
        const interval = { limit: 151, offset: 0 };
        P.getPokemonsList(interval)
            .then(async (response) => {
                //console.log(response.results[1].name);
                for (let i = 0; i < 151; i++) {
                    const original = await P.getPokemonSpeciesByName(response.results[i].name);
                    const ger = original.names.filter((pokeAPIName) => pokeAPIName.language.name === 'de')[0].name;
                    const pokemon = await P.getPokemonByName(response.results[i].name);
                    const front_sprites_url = pokemon.sprites.front_default;
                    const client = await pool.connect();
                    try {
                        await client.query('SET search_path TO "Pokedex";');
                        await client.query('INSERT INTO pokemon (name, front_sprites) VALUES ($1, $2);', [ger, front_sprites_url]);
                    } catch (error) {
                        console.error('Fehler beim Abrufen der Pokémon-Daten:', error);
                    } finally {
                        client.release();
                    }
                }

            });
    } catch (error) {
        console.error('Fehler beim Abrufen der Pokémon-Daten:', error);
    }
})();