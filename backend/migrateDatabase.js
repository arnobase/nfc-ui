const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Assurez-vous que ce chemin correspond à l'emplacement de votre base de données
const dbPath = path.join(__dirname, 'database.sqlite');

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // Activer le mode foreign keys
  db.run('PRAGMA foreign_keys = OFF');

  // Commencer une transaction
  db.run('BEGIN TRANSACTION');

  // Étape 1: Vérifier la structure de la table existante
  db.all("PRAGMA table_info(associations)", [], (err, columns) => {
    if (err) {
      console.error("Erreur lors de la vérification de la structure de la table :", err);
      db.run('ROLLBACK');
      db.close();
      return;
    }

    console.log("Structure de la table actuelle :", columns);

    // Étape 2: Renommer la table existante
    db.run("ALTER TABLE associations RENAME TO old_associations", (err) => {
      if (err) {
        console.error("Erreur lors du renommage de la table :", err);
        db.run('ROLLBACK');
        db.close();
        return;
      }

      // Étape 3: Créer la nouvelle table
      db.run(`CREATE TABLE associations (
        nfcId TEXT PRIMARY KEY,
        media TEXT,
        mediaType TEXT,
        title TEXT
      )`, (err) => {
        if (err) {
          console.error("Erreur lors de la création de la nouvelle table :", err);
          db.run('ROLLBACK');
          db.close();
          return;
        }

        // Étape 4: Transférer les données
        const hasYoutubeUrl = columns.some(col => col.name === 'youtubeUrl');
        const hasVideoTitle = columns.some(col => col.name === 'videoTitle');

        let insertQuery = `INSERT INTO associations (nfcId, media, mediaType, title)
          SELECT 
            nfcId, 
            ${hasYoutubeUrl ? 'youtubeUrl' : 'media'} as media,
            ${hasYoutubeUrl ? "'youtube'" : "'file'"} as mediaType,
            ${hasVideoTitle ? 'videoTitle' : 'media'} as title
          FROM old_associations`;

        db.run(insertQuery, (err) => {
          if (err) {
            console.error("Erreur lors du transfert des données :", err);
            db.run('ROLLBACK');
            db.close();
            return;
          }

          // Étape 5: Vérifier les données
          db.all("SELECT * FROM associations", [], (err, rows) => {
            if (err) {
              console.error("Erreur lors de la vérification des données :", err);
              db.run('ROLLBACK');
            } else {
              console.log("Données migrées :", rows);
              
              // Étape 6: Supprimer l'ancienne table
              db.run("DROP TABLE old_associations", (err) => {
                if (err) {
                  console.error("Erreur lors de la suppression de l'ancienne table :", err);
                  db.run('ROLLBACK');
                } else {
                  db.run('COMMIT', (err) => {
                    if (err) {
                      console.error("Erreur lors de la validation de la transaction :", err);
                    } else {
                      console.log("Migration terminée avec succès");
                    }
                    db.close();
                  });
                }
              });
            }
          });
        });
      });
    });
  });
});
