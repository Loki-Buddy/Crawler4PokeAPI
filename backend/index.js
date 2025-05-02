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

/* P.getResource(['/api/v2/pokemon/1'])
    .then((response) => {
        console.log(response.json);
    })
    .catch((error) => {
        console.log(error);
    }); */

(async () => {
    try {
        const bulbasaur = await P.getPokemonSpeciesByName('bulbasaur');
        const bisasam = bulbasaur.names.filter((pokeAPIName) => pokeAPIName.language.name === 'de')[0].name;
        console.log(bisasam);
    } catch (error) {
        console.error('Fehler beim Abrufen der Pokémon-Daten:', error);
    }
})();