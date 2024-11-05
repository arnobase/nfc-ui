const SambaClient = require('samba-client');

const client = new SambaClient({
  address: '//192.168.1.29/LMSFiles', // Adresse du partage Samba
  username: 'tc',                     // Nom d'utilisateur
  password: 'tcpassword',             // Mot de passe
  domain: 'WORKGROUP',                // Domaine, si nécessaire
});

// Test de l'écriture d'un fichier
const localFilePath = 'yarn.lock';
const remoteFileName = 'yarn.lock';

client.sendFile(localFilePath, remoteFileName)
  .then(() => {
    console.log('Fichier transféré avec succès.');
  })
  .catch((err) => {
    console.error('Erreur lors du transfert vers le serveur Samba:', err);
  });
