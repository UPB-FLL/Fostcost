#!/usr/bin/env bash
# Quick deploy script for AWS EC2 (Amazon Linux 2 / Ubuntu)
set -e

echo "=== Installing dependencies ==="
sudo apt-get update -y 2>/dev/null || sudo yum update -y
sudo apt-get install -y python3-pip 2>/dev/null || sudo yum install -y python3-pip

pip3 install -r requirements.txt

echo "=== Copying .env.example → .env (edit before running!) ==="
[ -f .env ] || cp .env.example .env

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  IMPORTANT: Edit .env and add your API keys before starting  ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "To start the server:"
echo "  gunicorn wsgi:app --bind 0.0.0.0:5000 --workers 2 --daemon"
echo ""
echo "To run as a systemd service, see DEPLOY.md"
