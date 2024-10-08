const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');  // Importer le package cors
const axios = require('axios');
const https = require('https'); // Importer le module HTTPS
const fs = require('fs'); // Importer le module FS
const { createProxyMiddleware } = require('http-proxy-middleware');
require('dotenv').config({ path: '../.env' }); // Charger le fichier .env à la racine

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // Ignorer les erreurs de certificat

const app = express();

// Charger le certificat et la clé
const options = {
    key: fs.readFileSync(path.join(__dirname, 'server.key')), // Chemin vers votre fichier de clé
    cert: fs.readFileSync(path.join(__dirname, 'server.cert')) // Chemin vers votre fichier de certificat
};

console.log(options);

// Utiliser le middleware CORS
app.use(cors());  // Utiliser le middleware CORS
app.use(bodyParser.json());

// Proxifier les requêtes vers le serveur LMS afin de les apeller en https
app.use('/lms', createProxyMiddleware({
    target: process.env.REACT_APP_LMS_HOST+":"+process.env.REACT_APP_LMS_PORT,
    changeOrigin: true,
    pathRewrite: {
        '^/lms': '', // Supprimer le préfixe /lms de l'URL
    },
    secure: false, // Ignorer les erreurs de certificat SSL
}));

// Connexion à SQLite (utilisation d'un fichier de base de données persistant)
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// Afficher le chemin de la base de données
console.log(`Base de données SQLite située à : ${dbPath}`);

// Créer la table des associations si elle n'existe pas déjà
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS associations (
        nfcId TEXT PRIMARY KEY,
        youtubeUrl TEXT,
        videoTitle TEXT
    )`, (err) => {
        if (err) {
            console.error('Error creating table:', err.message);
        }
    });
});

// Function to get YouTube video title
async function getYouTubeVideoTitle(videoUrl) {
    const videoId = videoUrl.split('v=')[1];
    if (!videoId) {
        console.error('Invalid YouTube URL:', videoUrl);
        return null;
    }

    const apiKey = process.env.REACT_APP_YOUTUBE_API_KEY; // Replace with your YouTube API key
    const apiUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${apiKey}&part=snippet`;

    try {
        const response = await axios.get(apiUrl);
        if (response.data.items.length === 0) {
            console.error('No video found for ID:', videoId);
            return null;
        }
        const title = response.data.items[0].snippet.title;
        return title;
    } catch (error) {
        console.error('Error fetching YouTube video title:', error.message);
        return null;
    }
}

app.use(express.static(path.join(__dirname, 'public')));

// Route pour enregistrer ou mettre à jour l'association
app.post('/save-association', async (req, res) => {
    const { nfcId, youtubeUrl } = req.body;

    if (!nfcId || !youtubeUrl) {
        return res.status(400).json({ error: 'nfcId and youtubeUrl are required' });
    }

    console.log(req.body);

    let videoTitle = req.body.videoTitle;
    if (!videoTitle) {
        videoTitle = await getYouTubeVideoTitle(youtubeUrl);
    }

    // Utiliser INSERT OR REPLACE pour insérer ou mettre à jour
    db.run(`INSERT OR REPLACE INTO associations (nfcId, youtubeUrl, videoTitle) VALUES (?, ?, ?)`, [nfcId, youtubeUrl, videoTitle], (err) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ message: 'Association saved or updated successfully' });
    });
});

// Endpoint to get associations
app.get('/get-associations', (req, res) => {
    db.all('SELECT nfcId, youtubeUrl, videoTitle FROM associations', [], async (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        // Fetch video titles if not already present
        for (let row of rows) {
            if (!row.videoTitle && row.youtubeUrl) {
                row.videoTitle = await getYouTubeVideoTitle(row.youtubeUrl);
                db.run('UPDATE associations SET videoTitle = ? WHERE nfcId = ?', [row.videoTitle, row.nfcId], (updateErr) => {
                    if (updateErr) {
                        console.error('Error updating video title:', updateErr.message);
                    }
                });
            }
        }

        res.json(rows);
    });
});

// Endpoint to delete an association
app.delete('/delete-association/:nfcId', (req, res) => {
    const { nfcId } = req.params;

    db.run('DELETE FROM associations WHERE nfcId = ?', [nfcId], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Association not found' });
        }
        res.status(200).json({ message: 'Association deleted successfully' });
    });
});

// Route pour jouer une vidéo sur le périphérique distant
app.get('/lms-play', (req, res) => {
    const content = req.query.content; // Récupérer le paramètre content de la requête

    if (!content) {
        return res.status(400).json({ error: 'Le paramètre content est requis.' });
    }

    // Construire l'URL pour le proxy
    //req.url = `/lms/anyurl?p0=playlist&p1=play&p2=${encodeURIComponent(content)}`; // Modifier l'URL de la requête
    req.url = `/lms/anyurl?p0=playlist&p1=play&p2=${encodeURIComponent(content)}`
    // Appeler le middleware de proxy existant
    // Note: Le middleware de proxy pour /lms doit déjà être configuré
    // Passer la requête et la réponse au middleware de proxy existant
    app._router.handle(req, res, () => {
        res.status(404).send('Not Found');
    });
});

// Route pour jouer une vidéo sur le périphérique distant en utilisant nfcId
app.get('/lms-play-nfc/:nfcId', (req, res) => {
    const nfcId = req.params.nfcId; // Récupérer le nfcId de la requête
    console.log(req.params.nfcId);
    // Requête pour récupérer l'URL de la vidéo à partir de la base de données
    db.get('SELECT youtubeUrl, videoTitle FROM associations WHERE nfcId = ?', [nfcId], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            return res.status(404).json({ error: 'Association non trouvée pour ce nfcId.' });
        }

        const videoUrl = row.youtubeUrl; // Récupérer l'URL de la vidéo
        const videoTitle = row.videoTitle;
        
        // Rediriger vers /lms-play avec le paramètre content
        //res.redirect(`${host}:${port}/lms-play?content=${encodeURIComponent(videoUrl)}`);


        // Construire l'URL pour le proxy
        //req.url = `/lms/anyurl?p0=playlist&p1=play&p2=${encodeURIComponent(content)}`; // Modifier l'URL de la requête
        console.log(`appel de l'URL : ${videoUrl} `)
        req.url = `/lms/anyurl?p0=playlist&p1=play&p2=${encodeURIComponent(videoUrl)}`
        app._router.handle(req, res, () => {
            res.status(404).send('Not Found');
        });
        console.log(`requête de lecture envoyée : ${videoTitle} `)

        /*
        // Construire l'URL pour le proxy
        //req.url = `/lms/anyurl?p0=playlist&p1=play&p2=${encodeURIComponent(content)}`; // Modifier l'URL de la requête
        req.url = `/lms-play?content=${encodeURIComponent(videoUrl)}`
        // Appeler le middleware de proxy existant
        // Note: Le middleware de proxy pour /lms doit déjà être configuré
        // Passer la requête et la réponse au middleware de proxy existant
        app._router.handle(req, res, () => {
            res.status(404).send('Not Found');
        });
        */

    });
});

// Démarrer le serveur HTTPS
https.createServer(options, app).listen(process.env.REACT_APP_BACKEND_PORT, () => {
    console.log(`Serveur en cours d'exécution sur ${process.env.REACT_APP_SERVER_HOST}:${process.env.REACT_APP_BACKEND_PORT}`);
});
