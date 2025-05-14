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
        const allPokemon = await P.getPokemonsList({ limit: 151, offset: 0 });
        let weak = [];
        let strong = [];
        let immune = [];

        for (let i = 0; i < allPokemon.results.length; i++) {
            const this_pokemon = await P.getPokemonByName(allPokemon.results[i].name);
            const type_slot1 = await P.getTypeByName(this_pokemon.types[0].type.name);
            const type_slot2 = this_pokemon.types[1] ? await P.getTypeByName(this_pokemon.types[1].type.name) : null; // Zweiter Typ (falls vorhanden)

            for (let j = 0; j < type_slot1.damage_relations.double_damage_from.length; j++) {
                weak.push(type_slot1.damage_relations.double_damage_from[j].name);
                console.log(type_slot1.damage_relations.double_damage_from[j].name + ' ist schwach gegen ' + this_pokemon.types[0].type.name);
            }

            for (let j = 0; j < type_slot1.damage_relations.double_damage_to.length; j++) {
                strong.push(type_slot1.damage_relations.double_damage_to[j].name)
                console.log(type_slot1.damage_relations.double_damage_to[j].name + ' ist stark gegen ' + this_pokemon.types[0].type.name);
            }

            for (let j = 0; j < type_slot1.damage_relations.no_damage_from.length; j++) {
                immune.push(type_slot1.damage_relations.no_damage_from[j].name)
                console.log(type_slot1.damage_relations.no_damage_from[j].name + ' ist immun gegen ' + this_pokemon.types[0].type.name);
            }

            if (type_slot2 !== null) {
                for (let j = 0; j < type_slot2.damage_relations.double_damage_from.length; j++) {
                    weak.push(type_slot2.damage_relations.double_damage_from[j].name);
                    console.log(type_slot2.damage_relations.double_damage_from[j].name + ' ist schwach gegen ' + this_pokemon.types[1].type.name);
                }

                for (let j = 0; j < type_slot2.damage_relations.double_damage_to.length; j++) {
                    strong.push(type_slot2.damage_relations.double_damage_to[j].name);
                    console.log(type_slot2.damage_relations.double_damage_to[j].name + ' ist stark gegen ' + this_pokemon.types[1].type.name);
                }

                for (let j = 0; j < type_slot2.damage_relations.no_damage_from.length; j++) {
                    immune.push(type_slot2.damage_relations.no_damage_from[j].name);
                    console.log(type_slot2.damage_relations.no_damage_from[j].name + ' ist immun gegen ' + this_pokemon.types[1].type.name);
                }
            }

            weak = [...new Set(weak)];
            strong = [...new Set(strong)];
            immune = [...new Set(immune)];

            const client = await pool.connect();
            try {
                await client.query(`SET search_path TO "BattleMechanic";`)
                await client.query(`INSERT INTO pokemon_weak_strong_immune (pokemon_id, weak, strong, immune) VALUES ($1, $2, $3, $4)`, [this_pokemon.id, weak, strong, immune]);

                weak = [];
                strong = [];
                immune = [];
                console.log('Eintrag wurde erfolgreich gespeichert!');
            } catch (error) {
                console.error(error);
            } finally {
                client.release();
            }

        }
    } catch (error) {
        console.error('Fehler! Error: ', error)
    }

})();