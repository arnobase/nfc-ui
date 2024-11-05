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
    key: fs.readFileSync(path.join(__dirname, 'server.key')), // Chemin vers votre fichier de clé
    cert: fs.readFileSync(path.join(__dirname, 'server.cert')) // Chemin vers votre fichier de certificat
};

console.log(options);

// Utiliser le middleware CORS
app.use(cors());  // Utiliser le middleware CORS
app.use(bodyParser.json());

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

// Proxifier les requêtes vers le serveur LMS
app.use('/lms', createProxyMiddleware({
    target: process.env.REACT_APP_LMS_HOST + ":" + process.env.REACT_APP_LMS_PORT,
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
    const { nfcId, media, mediaType } = req.body;

    if (!nfcId || !media || !mediaType) {
        return res.status(400).json({ error: 'nfcId, media et mediaType sont requis' });
    }

    console.log(req.body);

    let title = '';
    if (mediaType === 'youtube') {
        title = await getYouTubeVideoTitle(media);
    } else {
        title = media; // Pour les fichiers, utilisez le nom du fichier comme titre
    }

    // Utiliser INSERT OR REPLACE pour insérer ou mettre à jour
    db.run(`INSERT OR REPLACE INTO associations (nfcId, media, mediaType, title) VALUES (?, ?, ?, ?)`, [nfcId, media, mediaType, title], (err) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ message: 'Association saved or updated successfully' });
    });
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
    db.get('SELECT media, mediaType, title FROM associations WHERE nfcId = ?', [nfcId], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            return res.status(404).json({ error: 'Association non trouvée pour ce nfcId.' });
        }

        const mediaUrl = row.media; // Récupérer l'URL de la vidéo
        const mediaType = row.mediaType;
        const title = row.title;
        
        // Rediriger vers /lms-play avec le paramètre content
        //res.redirect(`${host}:${port}/lms-play?content=${encodeURIComponent(mediaUrl)}`);


        // Construire l'URL pour le proxy
        //req.url = `/lms/anyurl?p0=playlist&p1=play&p2=${encodeURIComponent(content)}`; // Modifier l'URL de la requête
        console.log(`appel de l'URL : ${mediaUrl} `)
        if (mediaType === "file") {
            //anyurl?p0=playlist&p1=play&p2=file%3A%2F%2F%2Fmnt%2Fusb64%2Fupload%2Fcomptine-il-pleut-il-mouille-c-est-la-fete-a-la-grenouille-voix.mp3
            const filePath = `file:///mnt/usb64/upload/${row.media}`;
            req.url = `/lms/anyurl?p0=playlist&p1=play&p2=${encodeURIComponent(filePath)}`
        }
        else req.url = `/lms/anyurl?p0=playlist&p1=play&p2=${encodeURIComponent(mediaUrl)}`
        app._router.handle(req, res, () => {
            res.status(404).send('Not Found');
        });
        console.log(`requête de lecture envoyée : ${title} `)

        /*
        // Construire l'URL pour le proxy
        //req.url = `/lms/anyurl?p0=playlist&p1=play&p2=${encodeURIComponent(content)}`; // Modifier l'URL de la requête
        req.url = `/lms-play?content=${encodeURIComponent(mediaUrl)}`
        // Appeler le middleware de proxy existant
        // Note: Le middleware de proxy pour /lms doit déjà être configuré
        // Passer la requête et la réponse au middleware de proxy existant
        app._router.handle(req, res, () => {
            res.status(404).send('Not Found');
        });
        */

    });
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
        password: 'tcpassword',
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
