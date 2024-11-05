#!/bin/bash

# Fonction pour arrêter les serveurs
function stop_servers {
    echo "Stopping servers..."
    kill $FRONTEND_PID
    kill $BACKEND_PID
    exit
}

# Piéger les signaux pour arrêter les serveurs proprement
trap stop_servers SIGINT SIGTERM

# Démarrer le frontend
echo "Starting frontend..."
cd frontend
HTTPS=true yarn dev &
FRONTEND_PID=$!
cd ..

# Démarrer le backend
echo "Starting backend..."
cd backend
export NODE_OPTIONS=--openssl-legacy-provider
node server.js &
BACKEND_PID=$!
cd ..

# Attendre que les processus se terminent et afficher les logs
wait $FRONTEND_PID
wait $BACKEND_PID