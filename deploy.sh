#!/bin/bash
# ================================
# Deployment Script for npcdatavault.npc.ac.rw
# ================================

BACKEND_DIR="/home/npc-server/Documents/npc-innovation-hub-bn"
PM2_APP_NAME="Npc-smart-report-bn"  # Fixed: Match your actual PM2 process name

# ---- Backend ----
echo "[backend] Updating backend..."
cd "$BACKEND_DIR" || { echo "Backend dir not found: $BACKEND_DIR"; exit 1; }

# Pull latest code
echo "[git] Pulling latest changes..."
git pull origin main || { echo "Git pull failed"; exit 1; }

# Install dependencies
echo "[npm] Installing dependencies..."
npm install || { echo "npm install failed"; exit 1; }

# Check if .env exists
if [ ! -f .env ]; then
    echo "WARNING: .env file not found!"
    echo "Please ensure environment variables are configured"
fi

# Restart backend via PM2
echo "[pm2] Restarting application..."
pm2 stop "$PM2_APP_NAME" 2>/dev/null || true
pm2 delete "$PM2_APP_NAME" 2>/dev/null || true

# Start with the correct command (using npm start which runs ts-node)
pm2 start npm --name "$PM2_APP_NAME" -- run start

# Save PM2 configuration
pm2 save

# Show PM2 status
echo "[pm2] Current status:"
pm2 list

# Reload Nginx
echo "[system] Reloading Nginx..."
sudo nginx -t || { echo "Nginx config test failed"; exit 1; }
sudo systemctl reload nginx || { echo "Nginx reload failed"; exit 1; }

echo "==============================="
echo "Deployment completed successfully!"
echo "==============================="
echo ""
echo "Check logs with: pm2 logs $PM2_APP_NAME"
echo "Check status with: pm2 status"
