import dotenv from 'dotenv';

// Charger les variables d'environnement depuis le fichier .env situé dans le dossier parent
dotenv.config({ path: '../.env' });

export const YOUTUBE_API_KEY = process.env.REACT_APP_YOUTUBE_API_KEY;