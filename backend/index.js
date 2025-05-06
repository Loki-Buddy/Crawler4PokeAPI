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
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
// die Tabelle Pokedex.pokemon mit den Daten der Pokémon-API befuellen
(async () => {
    try {
        const interval = { limit: 151, offset: 0 };
        const allPokemon = await P.getPokemonsList(interval); // alle Pokémon abrufen

        // die Daten der Pokémon in die Tabelle schreiben
        for (let i = 0; i < 151; i++) {
            //  Fetch auf die Species um auf die Namen und die Beschreibung in deutscher Sprache zu kommen
            const original = await P.getPokemonSpeciesByName(allPokemon.results[i].name);
            const ger = original.names.filter((pokeAPIName) => pokeAPIName.language.name === 'de')[0].name;

            // Zugriff auf den Flavor_Text um auf die Beschreibung in deutscher Sprache zu kommen
            const german_flavor_text =
                original.flavor_text_entries.filter((flavor_text) => flavor_text.language.name === 'de')[0].flavor_text;

            // Formatierung der Beschreibung
            const cleanedFlavorText = german_flavor_text.replace(/\n/g, ' ').trim();

            // Fetch auf die Pokémon um weitere Deatils abzufragen
            const pokemon = await P.getPokemonByName(allPokemon.results[i].name);
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
                    `INSERT INTO pokemon (api_name, ger_name, height, weight, flavor_text, front_sprites)
                            VALUES ($1, $2, $3, $4, $5, $6);`,
                    [allPokemon.results[i].name, ger, height, weight, cleanedFlavorText, front_sprites_url]);

            } catch (error) {
                console.error('Fehler beim Abrufen der Pokémon-Daten:', error);
            } finally {
                // Verbindung zur Datenbank schliessen bzw freigeben
                client.release();
            }
        }

    } catch (error) {
        console.error('Fehler beim Abrufen der Pokémon-Daten:', error);
    }
})();

// Die Tabelle Pokedex.typ mit den Daten der Pokémon-API befuellen
(async () => {
    try {
        const response = await P.getTypesList({ limit: 18, offset: 0 })
        console.log(response);
        for (let i = 0; i < 18; i++) {
            const api_typ = response.results[i].name;

            if(api_typ === 'dark') {
                continue;
            }

            const typeDetails = await P.getTypeByName(api_typ);
            const ger_typ = typeDetails.names.filter((pokeAPIName) => pokeAPIName.language.name === 'de')[0].name;

            const client = await pool.connect();
            try {
                await client.query('SET search_path TO "Pokedex";');
                await client.query(`INSERT INTO typ (api_name, ger_name) VALUES ($1, $2);`, [api_typ, ger_typ]);
            } catch (error) {
                console.error('Fehler beim Abrufen der Pokémon-Daten:', error);
            } finally {
                client.release();
            }

            await sleep(500);
        }
    } catch (error) {
        console.error('Fehler beim Abrufen der Pokémon-Daten:', error);
    }
})();

await sleep(10000);

// Die Tabelle Pokedex.pokemon_typ mit den Daten aus den oberen beiden Tabellen füllen und mittels den Daten der Pokémon-API ergänzen
(async () => {
    try {
        const allPokemon = await P.getPokemonsList({ limit: 151, offset: 0 });
        const client = await pool.connect();
        try {
            await client.query(`SET search_path TO "Pokedex";`);
            const resultTyp = await client.query(`SELECT * FROM typ`);

            for (let i = 0; i < 151; i++) {
                const pokemon = await P.getPokemonByName(allPokemon.results[i].name);
                const api_typSlot1 = pokemon.types[0].type.name;
                const api_typSlot2 = pokemon.types[1] ? pokemon.types[1].type.name : null;
                
                const db_typSlot1 = resultTyp.rows.find((typ) => typ.api_name === api_typSlot1);
                const db_typSlot2 = api_typSlot2 ? resultTyp.rows.find((typ) => typ.api_name === api_typSlot2) : null;

                await sleep(1000);
                //console.log(db_typSlot1.id, db_typSlot2?.id);

                await client.query(`INSERT INTO pokemon_typ (pokemon_id, typ_id, slot) VALUES ($1, $2, $3);`, [i + 1, db_typSlot1.id, 1]);
                
                if(db_typSlot2) {
                    await client.query(`INSERT INTO pokemon_typ (pokemon_id, typ_id, slot) VALUES ($1, $2 , $3);`, [i + 1, db_typSlot2.id, 2]);
                }

            }


        } catch (error) {
            console.error('Fehler beim Abrufen der Pokémon-Daten:', error);
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Fehler beim Abrufen der Pokémon-Daten:', error);
    }
})();