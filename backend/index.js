import Pokedex from 'pokedex-promise-v2';
//const { Pool } = requires('pg');


const P = new Pokedex();

/* P.getResource(['/api/v2/pokemon/1'])
    .then((response) => {
        console.log(response.json);
    })
    .catch((error) => {
        console.log(error);
    }); */

async () => {
    try {
        const bulbasaur = await P.getPokemonSpeciesByName(pokemonName);
        const bisasam = bulbasaur.names.filter((pokeAPIName) => pokeAPIName.language.name === 'de')[0].name;
        console.log(bisasam);
    } catch (error) {
        console.error('Fehler beim Abrufen der Pokémon-Daten:', error);
    }
}
    

/* const pg = require('pg');
const client = new pg.Client({
    user: 'postgres',
    host: 'localhost',
    database: 'postgres',
    password: 'postgres',
    port: 5432,
});
client.connect(); */