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
        const gifUrl_front = `${front_sprite_gif_url}${pokemonName}.gif`;
        const response = await axios.get(gifUrl_front, { responseType: 'arraybuffer' });
        const gifBuffer = Buffer.from(response.data);

        if (!gifBuffer) {
            return null;
        }
    } catch (error) {
        console.error(`${pokemonName} Fehler beim Download der Datei!`);
    }
}

const downloadBackGif = async (pokemonName) => {
    try {
        const gifUrl_back = `${back_sprite_gif_url}${pokemonName}.gif`;
        const response = await axios.get(gifUrl_back, { responseType: 'arraybuffer' });
        const gifBuffer = Buffer.from(response.data);

        if (!gifBuffer) {
            return null;
        }
    } catch (error) {
        console.error(pokemonName + ' ' +'Fehler beim Download der Datei!');
    }
}

(async () => {
    try {
        const allPokemon = await P.getPokemonsList({limit: 151, offset: 0}); // Abrufen der Pokémon-Liste
        for (let i = 0; i < allPokemon.results.length ; i++) {
            // Abrufen der Spezies-Daten eines Pokémon
            const original = await P.getPokemonSpeciesByName(allPokemon.results[i].name);
            const ger = original.names.filter((pokeAPIName) => pokeAPIName.language.name === 'de')[0].name; // Deutscher Name des Pokémon
            const this_pokemon = await P.getPokemonByName(allPokemon.results[i].name);
            const cry_url = this_pokemon.cries.latest;
            const hp = this_pokemon.stats[0].base_stat;
            const attack = this_pokemon.stats[1].base_stat;
            const defense = this_pokemon.stats[2].base_stat;
            const speed = this_pokemon.stats[5].base_stat;
            
            const client = await pool.connect(); // Verbindung zur Datenbank herstellen
            try {
                await client.query('SET search_path TO "BattleMechanic";'); // Setzen des Schemas
                // Einfügen der Pokémon-Daten in die Datenbank
                
                await client.query(
                    `INSERT INTO pokemon (api_name, ger_name, front_sprite, back_sprite, cry_url, hp, attack, defense, speed)
                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);`,
                    [allPokemon.results[i].name, ger, downloadFrontGif(allPokemon.results[i].name), downloadBackGif(allPokemon.results[i].name), cry_url, hp, attack, defense, speed]
                );
                await sleep(500);
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

// Verzögerung, um der Datenbank Zeit zu geben die Daten abzuspeichern
//await sleep(5000);

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
                await client.query('SET search_path TO "BattleMechanic";'); // Setzen des Schemas
                // Einfügen der Typ-Daten in die Datenbank
                await client.query(`INSERT INTO typ (api_name, ger_name) VALUES ($1, $2);`, [api_typ, ger_typ]);
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
/* (async () => {
    try {
        const response = await P.getMovesList({ limit: 1, offset: 0 }); // Abrufen der Move-Liste

        for (let i = 0; i < response.results.length; i++) {

            const api_name = response.results[i].name; // Name des Moves aus der API
            const moveDetails = await P.getMoveByName(api_name); // Abrufen der Move-Details
            const moveCategories = await P.getMoveCategoriesList();
            await sleep(1000)
            const learned_by_Pokemon = moveDetails.learned_by_pokemon;
            let my_pokemon = [];
            
            for(let j = 0; j < learned_by_Pokemon.length; j++){
                const this_pokemon = await P.getPokemonByName(learned_by_Pokemon[j].name);
                const detail_this_pokemon = await P.getPokemonSpeciesByName(this_pokemon.name);

                if(detail_this_pokemon.id > 151){
                    break;
                }
                my_pokemon.push(detail_this_pokemon);
            }

            
            
            const ger_name = moveDetails.names.filter((pokeAPIName) => pokeAPIName.language.name === 'de')[0].name; // Deutscher Name des Moves
            const accuracy = moveDetails.accuracy; // Genauigkeit des Moves in Prozent
            const effect_chance = moveDetails.effect_chance; // Effektchance des Moves in Prozent
            const german_flavor_text = moveDetails.flavor_text_entries.filter((flavor_text) => flavor_text.language.name === 'de')[0].flavor_text; // Deutscher Flavor-Text des Moves


        }
    } catch (error) {
        console.error('Fehler beim Abrufen der Pokémon-Daten!', error); // Fehlerbehandlung
    }
})(); */