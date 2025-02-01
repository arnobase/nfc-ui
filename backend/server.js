const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');  // Importer le package cors
const axios = require('axios');
const https = require('https'); // Importer le module HTTPS
const fs = require('fs'); // Importer le module FS
const { createProxyMiddleware } = require('http-proxy-middleware');
const multer = require('multer');
const SambaClient = require('samba-client');
require('dotenv').config({ path: '../.env' });
const WebSocket = require('ws'); // Importer la bibliothèque WebSocket

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // Ignorer les erreurs de certificat

const app = express();

// Charger le certificat et la clé
const options = {
    key: fs.readFileSync('/etc/letsencrypt/live/nfcui.gardies.fr/privkey.pem'),
    cert: fs.readFileSync('/etc/letsencrypt/live/nfcui.gardies.fr/fullchain.pem')
};

console.log(options);

// Utiliser le middleware CORS
app.use(cors());  // Utiliser le middleware CORS
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Ajouter un middleware de logging général avant tout
app.use((req, res, next) => {
    console.log('🔍 Requête reçue:', {
        method: req.method,
        url: req.url,
        originalUrl: req.originalUrl,
        path: req.path,
        timestamp: new Date().toISOString()
    });
    next();
});

// Créer un serveur HTTPS
const server = https.createServer(options, app);

// Créer un serveur WebSocket
const wss = new WebSocket.Server({ server }); // Utiliser le même serveur HTTPS

// Gérer les connexions WebSocket
wss.on('connection', (ws) => {
    console.log('Client connecté');

    ws.on('close', () => {
        console.log('Client déconnecté');
    });
});

// Remplacer la configuration du proxy par une route dédiée
app.post('/lms/*', async (req, res) => {
    const targetPath = req.path.replace('/lms', '');
    const targetUrl = `${process.env.REACT_APP_LMS_HOST}:${process.env.REACT_APP_LMS_PORT}${targetPath}`;

    console.log('🎯 Requête LMS:', {
        targetUrl,
        method: req.method,
        body: req.body,
        headers: req.headers
    });

    try {
        const response = await axios({
            method: req.method,
            url: targetUrl,
            data: req.body,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        console.log('✅ Réponse LMS:', {
            status: response.status,
            data: response.data
        });

        res.status(response.status).json(response.data);
    } catch (error) {
        console.error('❌ Erreur LMS:', {
            message: error.message,
            response: error.response?.data,
            targetUrl
        });
        res.status(error.response?.status || 500).json({
            error: error.message,
            details: error.response?.data
        });
    }
});

// Connexion à SQLite (utilisation d'un fichier de base de données persistant)
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

// Afficher le chemin de la base de données
console.log(`Base de données SQLite située à : ${dbPath}`);

// Créer la table des associations si elle n'existe pas déjà
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS associations (
        nfcId TEXT PRIMARY KEY,
        media TEXT,
        mediaType TEXT,
        title TEXT
    )`, (err) => {
        if (err) {
            console.error('Error creating table:', err.message);
        }
    });

    // Créer la table des lectures si elle n'existe pas déjà
    db.run(`CREATE TABLE IF NOT EXISTS readings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nfcId TEXT,
        title TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) {
            console.error('Error creating readings table:', err.message);
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
    const { nfcId, media, mediaType, title } = req.body;

    console.log('Headers reçus:', req.headers);
    console.log('Body complet reçu:', req.body);

    if (!nfcId || !media || !mediaType) {
        return res.status(400).json({ error: 'nfcId, media et mediaType sont requis' });
    }

    // S'assurer que le titre n'est pas undefined ou null
    const finalTitle = title || media;

    console.log('Données à sauvegarder:', {
        nfcId,
        media,
        mediaType,
        title: finalTitle
    });

    // Utiliser INSERT OR REPLACE pour insérer ou mettre à jour
    db.run(
        `INSERT OR REPLACE INTO associations (nfcId, media, mediaType, title) VALUES (?, ?, ?, ?)`, 
        [nfcId, media, mediaType, finalTitle], 
        function(err) {
            if (err) {
                console.error('Erreur SQL:', err);
                return res.status(500).json({ error: err.message });
            }
            
            // Vérifier que l'insertion s'est bien passée
            db.get(
                'SELECT * FROM associations WHERE nfcId = ?',
                [nfcId],
                (err, row) => {
                    if (err) {
                        console.error('Erreur de vérification:', err);
                        return res.status(500).json({ error: err.message });
                    }
                    
                    if (!row) {
                        console.error('Aucune ligne trouvée après insertion');
                        return res.status(500).json({ error: 'Échec de l\'insertion' });
                    }
                    
                    console.log('Association sauvegardée en base:', row);
                    res.status(201).json({ 
                        message: 'Association saved or updated successfully',
                        title: row.title
                    });
                }
            );
        }
    );
});

// Endpoint to get associations
app.get('/get-associations', (req, res) => {
    db.all('SELECT nfcId, media, mediaType, title FROM associations', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
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
app.get('/lms-play', async (req, res) => {
    console.log("play");
    const content = req.query.content;

    if (!content) {
        return res.status(400).json({ error: 'Le paramètre content est requis.' });
    }

    try {
        const response = await axios.post(
            `${process.env.REACT_APP_LMS_HOST}:${process.env.REACT_APP_LMS_PORT}/jsonrpc.js`,
            {
                id: 1,
                method: "slim.request",
                params: [
                    process.env.REACT_APP_LMS_PLAYER_MAC,
                    ["playlist", "play", content]
                ]
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            }
        );

        res.json(response.data);
    } catch (error) {
        console.error('Erreur LMS:', error);
        res.status(500).json({ error: error.message });
    }
});

// Route pour jouer une vidéo sur le périphérique distant en utilisant nfcId
app.get('/lms-play-nfc/:nfcId', async (req, res) => {
    const nfcId = req.params.nfcId;
    
    try {
        const row = await new Promise((resolve, reject) => {
            db.get('SELECT media, mediaType, title FROM associations WHERE nfcId = ?', [nfcId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!row) {
            const defaultTitle = `Tag inconnu (${nfcId})`;
            // Enregistrer la lecture dans l'historique avec le titre par défaut
            db.run(`INSERT INTO readings (nfcId, title) VALUES (?, ?)`, [nfcId, defaultTitle], (err) => {
                if (err) {
                    console.error('Erreur lors de l\'enregistrement de la lecture:', err.message);
                }
                // Émettre un message WebSocket pour le tag inconnu
                emitReadingUpdate(nfcId, defaultTitle);
            });
            
            return res.status(404).json({ 
                error: 'Association non trouvée pour ce nfcId.',
                title: defaultTitle 
            });
        }

        let command;
        if (row.mediaType === "file") {
            const mediaUrl = `file:///mnt/usb64/upload/${row.media}`;
            command = ["playlist", "play", mediaUrl];
        } else if (row.media.startsWith('albumid:')) {
            const albumId = row.media.replace('albumid:', '');
            command = ["playlistcontrol", "cmd:load", `album_id:${albumId}`];
        } else if (row.media.startsWith('trackid:')) {
            const trackId = row.media.replace('trackid:', '');
            command = ["playlistcontrol", "cmd:load", `track_id:${trackId}`];
        } else if (row.media.startsWith('playlistid:')) {
            const playlistId = row.media.replace('playlistid:', '');
            command = ["playlistcontrol", "cmd:load", `playlist_id:${playlistId}`];
        } else {
            command = ["playlist", "play", row.media];
        }

        const requestBody = {
            id: 0,
            method: "slim.request",
            params: [
                process.env.REACT_APP_LMS_PLAYER_MAC,
                command
            ]
        };

        // Log détaillé de la requête
        console.log('Envoi de la requête à LMS:', {
            url: `${process.env.REACT_APP_LMS_HOST}:${process.env.REACT_APP_LMS_PORT}/jsonrpc.js`,
            body: requestBody,
            player_mac: process.env.REACT_APP_LMS_PLAYER_MAC
        });

        // Log de la commande curl équivalente pour debug manuel
        console.log('📟 Commande curl équivalente:');
        console.log(`curl --location '${process.env.REACT_APP_LMS_HOST}:${process.env.REACT_APP_LMS_PORT}/jsonrpc.js' \\
  --header 'Content-Type: application/json' \\
  --data '${JSON.stringify(requestBody)}'`);

        // Appeler le serveur LMS
        const response = await axios.post(
            `${process.env.REACT_APP_LMS_HOST}:${process.env.REACT_APP_LMS_PORT}/jsonrpc.js`,
            requestBody,
            {
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        // Enregistrer la lecture dans l'historique
        db.run(`INSERT INTO readings (nfcId, title) VALUES (?, ?)`, [nfcId, row.title], (err) => {
            if (err) {
                console.error('Erreur lors de l\'enregistrement de la lecture:', err.message);
            }
            emitReadingUpdate(nfcId, row.title);
        });

        console.log(`Lecture lancée : ${row.title}`);
        console.log('Réponse de LMS:', response.data);
        res.json({ success: true, message: 'Lecture lancée', title: row.title });

    } catch (error) {
        console.error('Erreur détaillée:', {
            message: error.message,
            code: error.code,
            config: error.config,
            response: error.response?.data
        });

        // Gérer les différents types d'erreurs
        if (error.code === 'ECONNREFUSED') {
            return res.status(503).json({ error: 'Le serveur LMS est inaccessible' });
        } else if (error.code === 'ECONNRESET') {
            return res.status(503).json({ error: 'La connexion au serveur LMS a été réinitialisée' });
        } else if (error.code === 'ETIMEDOUT') {
            return res.status(504).json({ error: 'Timeout de la connexion au serveur LMS' });
        }

        res.status(500).json({ 
            error: 'Erreur lors de la lecture',
            details: error.message,
            code: error.code
        });
    }
});

// Fonction pour émettre un message à tous les clients connectés
function emitReadingUpdate(nfcId, title) {
    const message = JSON.stringify({ nfcId, title, timestamp: new Date() });
    wss.clients.forEach((client) => {
        //console.log("WSS client",client)
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}
app.get('/get-tag-infos/:nfcId', (req, res) => {
    const nfcId = req.params.nfcId; // Récupérer le nfcId de la requête
    console.log(req.params.nfcId);
    
    // Requête pour récupérer l'URL de la vidéo à partir de la base de données
    db.get('SELECT media, mediaType, title FROM associations WHERE nfcId = ?', [nfcId], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (!row) {
            // Enregistrer la lecture dans l'historique avec un message d'erreur
            const title = 'Association non trouvée'; // Titre par défaut si non trouvé
            db.run(`INSERT INTO readings (nfcId, title) VALUES (?, ?)`, [nfcId, title], function(err) {
                if (err) {
                    console.error('Erreur lors de l\'enregistrement de la lecture:', err.message);
                }
                // Émettre un message à tous les clients connectés
                emitReadingUpdate(nfcId, title);
            });
            console.log(`INSERT INTO readings (nfcId, title) VALUES (?, ?)`, [nfcId, title]);
            
            // Renvoyer une erreur 404 si le tag n'est pas trouvé
            return res.status(404).json({ error: 'Association non trouvée pour ce nfcId.' });
        }

        const mediaUrl = row.media; // Récupérer l'URL de la vidéo
        const mediaType = row.mediaType;
        const title = row.title;

        // Enregistrer la lecture dans l'historique
        db.run(`INSERT INTO readings (nfcId, title) VALUES (?, ?)`, [nfcId, title], function(err) {
            if (err) {
                console.error('Erreur lors de l\'enregistrement de la lecture:', err.message);
            }
            // Émettre un message à tous les clients connectés
            emitReadingUpdate(nfcId, title);
        });
        console.log(`INSERT INTO readings (nfcId, title) VALUES (?, ?)`, [nfcId, title]);

        // Répondre avec les informations trouvées
        res.json({
            "url": mediaUrl,
            "title": title
        });
    });
});

// Configuration de multer pour gérer le téléchargement de fichiers
const upload = multer({ dest: 'uploads/' });

// Route pour télécharger un fichier et le transférer vers le serveur Samba
app.post('/lms-upload-file', upload.single('file'), (req, res) => {
    const file = req.file;
    const rename = req.body.rename || file.originalname;

    if (!file) {
        return res.status(400).json({ error: 'Aucun fichier téléchargé.' });
    }

    const filePath = path.join(__dirname, file.path);

    // Utiliser samba-client pour transférer le fichier
    const client = new SambaClient({
        address: `${process.env.REACT_APP_SAMBA_SHARE}`,
        username: 'tc',
        password: 'tc',
        domain: 'WORKGROUP',
    });

    client.sendFile(filePath, `${process.env.REACT_APP_SAMBA_UPLOAD_DIR}/${rename}`)
        .then(() => {
            // Supprimer le fichier local après le transfert
            fs.unlink(filePath, (unlinkErr) => {
                if (unlinkErr) {
                    console.error('Erreur lors de la suppression du fichier local:', unlinkErr);
                }
            });

            res.status(200).json({ message: 'Fichier transféré avec succès.' });
        })
        .catch((err) => {
            console.error('Erreur lors du transfert vers le serveur Samba:', err);
            res.status(500).json({ error: 'Erreur lors du transfert vers le serveur Samba.' });
        });
});

// Endpoint pour récupérer l'historique des lectures avec une limite de 20 par défaut
app.get('/get-readings', (req, res) => {
    const limit = parseInt(req.query.limit) || 20; // Limite par défaut de 20 si non spécifiée

    db.all('SELECT nfcId, title, timestamp FROM readings ORDER BY timestamp DESC LIMIT ?', [limit], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Démarrer le serveur HTTPS
server.listen(process.env.REACT_APP_BACKEND_PORT, () => {
    console.log(`Serveur en cours d'exécution sur https://${process.env.REACT_APP_SERVER_HOST}:${process.env.REACT_APP_BACKEND_PORT}`);
});
