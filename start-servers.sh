#!/bin/bash

# Fichiers pour stocker les PIDs
FRONTEND_PID_FILE="/tmp/nfc-ui-frontend.pid"
BACKEND_PID_FILE="/tmp/nfc-ui-backend.pid"
LOG_DIR="/var/log"
FRONTEND_LOG="$LOG_DIR/nfc-ui-frontend.log"
BACKEND_LOG="$LOG_DIR/nfc-ui-backend.log"
SCRIPT_LOG="$LOG_DIR/nfc-ui.log"

# Fonction de logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$SCRIPT_LOG"
}

# Log des variables d'environnement importantes
log "Starting script with:"
log "USER: $(whoami)"
log "PWD: $(pwd)"
log "PATH: $PATH"
log "NODE_ENV: $NODE_ENV"

# Vérifier les permissions des fichiers de log
for logfile in "$FRONTEND_LOG" "$BACKEND_LOG" "$SCRIPT_LOG"; do
    touch "$logfile" 2>/dev/null || {
        echo "ERROR: Cannot create/write to $logfile"
        exit 1
    }
done

# Vérifier le répertoire de travail
if [ ! -d "/opt/nfc-ui" ]; then
    log "ERROR: Working directory /opt/nfc-ui does not exist"
    exit 1
fi

if [ ! -d "/opt/nfc-ui/frontend" ]; then
    log "ERROR: Frontend directory /opt/nfc-ui/frontend does not exist"
    exit 1
fi

if [ ! -d "/opt/nfc-ui/backend" ]; then
    log "ERROR: Backend directory /opt/nfc-ui/backend does not exist"
    exit 1
fi

# Nettoyer les anciens fichiers PID au démarrage
rm -f "$FRONTEND_PID_FILE" "$BACKEND_PID_FILE"

# Fonction pour arrêter les serveurs
function stop_servers {
    log "Stopping servers..."
    if [ -f "$FRONTEND_PID_FILE" ]; then
        kill $(cat "$FRONTEND_PID_FILE")
        rm "$FRONTEND_PID_FILE"
    fi
    if [ -f "$BACKEND_PID_FILE" ]; then
        kill $(cat "$BACKEND_PID_FILE")
        rm "$BACKEND_PID_FILE"
    fi
    exit
}

# Piéger les signaux pour arrêter les serveurs proprement
trap stop_servers SIGINT SIGTERM

# Vérifier que yarn est disponible
if ! command -v yarn &> /dev/null; then
    log "ERROR: yarn is not installed or not in PATH"
    exit 1
fi

# Vérifier que node est disponible
if ! command -v node &> /dev/null; then
    log "ERROR: node is not installed or not in PATH"
    exit 1
fi

# Démarrer le frontend
log "Starting frontend..."
cd frontend || { log "ERROR: Cannot cd to frontend directory"; exit 1; }
# Vérifier si node_modules existe
if [ ! -d "node_modules" ]; then
    log "Installing frontend dependencies..."
    yarn install || { log "ERROR: yarn install failed"; exit 1; }
fi

HTTPS=true yarn start > "$FRONTEND_LOG" 2>&1 &
FRONT_PID=$!
if [ $? -ne 0 ]; then
    log "ERROR: Failed to start frontend process"
    exit 1
fi
echo $FRONT_PID > "$FRONTEND_PID_FILE"
log "Frontend started with PID $FRONT_PID"
cd ..
sleep 3

# Démarrer le backend
log "Starting backend..."
cd backend || { log "ERROR: Cannot cd to backend directory"; exit 1; }
# Vérifier si node_modules existe
if [ ! -d "node_modules" ]; then
    log "Installing backend dependencies..."
    yarn install || { log "ERROR: yarn install failed"; exit 1; }
fi

node server.js > "$BACKEND_LOG" 2>&1 &
BACK_PID=$!
if [ $? -ne 0 ]; then
    log "ERROR: Failed to start backend process"
    exit 1
fi
echo $BACK_PID > "$BACKEND_PID_FILE"
log "Backend started with PID $BACK_PID"
cd ..

# Vérifier que les processus sont bien démarrés
sleep 5
if ! kill -0 $(cat "$FRONTEND_PID_FILE") 2>/dev/null; then
    log "ERROR: Frontend failed to start. Check $FRONTEND_LOG for details"
    tail -n 20 "$FRONTEND_LOG"
    exit 1
fi
if ! kill -0 $(cat "$BACKEND_PID_FILE") 2>/dev/null; then
    log "ERROR: Backend failed to start. Check $BACKEND_LOG for details"
    tail -n 20 "$BACKEND_LOG"
    exit 1
fi

log "Both services started successfully"

# Garder le script en vie pour systemd
while true; do
    if ! kill -0 $(cat "$FRONTEND_PID_FILE") 2>/dev/null || ! kill -0 $(cat "$BACKEND_PID_FILE") 2>/dev/null; then
        log "One of the services died"
        stop_servers
    fi
    sleep 5
done
