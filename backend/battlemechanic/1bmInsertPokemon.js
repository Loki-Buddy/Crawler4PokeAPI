import Pokedex from 'pokedex-promise-v2';
import axios from 'axios';
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

// https://projectpokemon.org/images/normal-sprite/bulbasaur.gif
// https://projectpokemon.org/images/sprites-models/normal-back/bulbasaur.gif

const front_sprite_gif_url ='https://projectpokemon.org/images/normal-sprite/';
const back_sprite_gif_url = 'https://projectpokemon.org/images/sprites-models/normal-back/'

const downloadFrontGif = async (pokemonName) => {
    try {
        let gifUrl_front;

        if (pokemonName === 'nidoran-f') {
            gifUrl_front = `${front_sprite_gif_url}nidoran_f.gif`;
        } else if (pokemonName === 'nidoran-m') {
            gifUrl_front = `${front_sprite_gif_url}nidoran_m.gif`;
        } else if (pokemonName === 'mr-mime') {
            gifUrl_front = `${front_sprite_gif_url}mr.mime.gif`;
        } else {
            gifUrl_front = `${front_sprite_gif_url}${pokemonName}.gif`;
        }
        
        const response = await axios.get(gifUrl_front, { responseType: 'arraybuffer' });
        const gifBuffer = Buffer.from(response.data);

        if (!gifBuffer) {
            return null;
        }
        return gifBuffer;
    } catch (error) {
        console.error(`${pokemonName} Fehler beim Download der Datei!`);
    }
}

const downloadBackGif = async (pokemonName) => {
    try {
        let gifUrl_back;

        if (pokemonName === 'nidoran-f') {
            gifUrl_back = `${back_sprite_gif_url}nidoran_f.gif`;
        } else if (pokemonName === 'nidoran-m') {
            gifUrl_back = `${back_sprite_gif_url}nidoran_m.gif`;
        } else if (pokemonName === 'mr-mime') {
            gifUrl_back = `${back_sprite_gif_url}mr._mime.gif`;
        } else {
            gifUrl_back = `${back_sprite_gif_url}${pokemonName}.gif`;
        }
        
        const response = await axios.get(gifUrl_back, { responseType: 'arraybuffer' });
        const gifBuffer = Buffer.from(response.data);

        if (!gifBuffer) {
            return null;
        }
        return gifBuffer;
    } catch (error) {
        console.error(pokemonName + ' ' +'Fehler beim Download der Datei!');
    }
}

(async () => {
    try {
        const allPokemon = await P.getPokemonsList({limit: 151, offset: 0}); // Abrufen der Pokémon-Liste
        for (let i = 0; i < allPokemon.results.length ; i++) {
            // Abrufen der Spezies-Daten eines Pokémon
            const this_species = await P.getPokemonSpeciesByName(allPokemon.results[i].name);
            const ger = this_species.names.filter((pokeAPIName) => pokeAPIName.language.name === 'de')[0].name; // Deutscher Name des Pokémon
            const this_pokemon = await P.getPokemonByName(allPokemon.results[i].name);
            const cry_url = this_pokemon.cries.latest;
            const hp = this_pokemon.stats[0].base_stat;
            const attack = this_pokemon.stats[1].base_stat;
            const special_attack = this_pokemon.stats[3].base_stat;
            const defense = this_pokemon.stats[2].base_stat;
            const special_defense = this_pokemon.stats[4].base_stat;
            const speed = this_pokemon.stats[5].base_stat;
            
            const client = await pool.connect(); // Verbindung zur Datenbank herstellen
            try {
                await client.query('SET search_path TO "BattleMechanic";'); // Setzen des Schemas
                // Einfügen der Pokémon-Daten in die Datenbank
                
                const frontGif = await downloadFrontGif(allPokemon.results[i].name);
                const backGif = await downloadBackGif(allPokemon.results[i].name);

                await client.query(
                    `INSERT INTO pokemon (api_name, ger_name, front_sprite, back_sprite, cry_url, hp, attack, special_attack, defense, special_defense, speed)
                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11);`,
                    [allPokemon.results[i].name, ger, frontGif, backGif, cry_url, hp, attack, special_attack, defense, special_defense, speed]
                );

                console.log('Pokemon wurde erfolgreich gespeichert! Name: '+ ger)
                
                //await sleep(500);
            } catch (error) {
                console.error('Fehler beim Abrufen der Pokémon-Daten die Tabelle "pokemon":', error); // Fehlerbehandlung
            } finally {
                client.release(); // Freigeben der Datenbankverbindung
            }
        }
    } catch (error) {
        console.error('Fehler beim Abrufen der Pokémon-Daten:', error); // Fehlerbehandlung
    }
})();