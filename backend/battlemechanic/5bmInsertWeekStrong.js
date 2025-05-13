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