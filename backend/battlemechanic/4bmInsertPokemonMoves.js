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
        const response = await P.getPokemonsList({ limit: 151, offset: 0 });

        for (let i = 0; i < response.results.length; i++) {
            const this_pokemon = await P.getPokemonByName(response.results[i].name);
            const moves = this_pokemon.moves;
            const moves_arr = [];
            console.log('Pokemon: ' + response.results[i].name);

            for (let j = 0; j < moves.length; j++) {
                const this_move = await P.getMoveByName(moves[j].move.name);
                
                if (this_move.id <= 163 && (this_move.meta.category.name.includes('damage') || this_move.meta.category.name.includes('ailment') || this_move.meta.category.name.includes('net-good-stats'))) {
                    const client = await pool.connect();
                    await sleep(500);
                    try {
                        await client.query(`SET search_path TO "BattleMechanic";`);
                        const db_move_id = await client.query(`SELECT id FROM moves WHERE api_name = $1;`, [this_move.name]);
                        
                        moves_arr.push(db_move_id.rows[0].id);

                        console.log('ID des Moves wurde erfolgreich ins array geschoben!'+ db_move_id.rows[0].id);
                    } catch (error) {
                        console.error('Fehler! :', error);
                    } finally {
                        client.release();
                    }
                }
            }
            const client = await pool.connect();
            try {
                await client.query(`SET search_path TO "BattleMechanic";`);
                await client.query(`INSERT INTO pokemon_moves (pokemon_id, moves_arr) VALUES ($1, $2);`, [this_pokemon.id, moves_arr]);
            } catch (error) {
                console.error('Fehler! :', error);
            } finally {
                client.release();
            }
        }
    } catch (error) {
        console.error('Fehler beim Abrufen der Pokémon-Daten!', error); // Fehlerbehandlung
    }
})();