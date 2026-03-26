# Deploy to AWS EC2

## Prerequisites
- EC2 instance (t3.micro or larger)  
- Security Group: open port **5000** (or 80/443 via Nginx)
- Python 3.9+

---

## 1. Upload the app

```bash
scp -i your-key.pem -r food_cost_tracker/ ec2-user@<IP>:~/food_cost_tracker
```

Or clone from your repo if you push it to GitHub.

---

## 2. SSH into the instance

```bash
ssh -i your-key.pem ec2-user@<IP>
cd ~/food_cost_tracker
```

---

## 3. Install & configure

```bash
bash deploy.sh
nano .env          # ← add your SQUARE_ACCESS_TOKEN and SPOTON_API_KEY
```

---

## 4. Start with Gunicorn

```bash
gunicorn wsgi:app --bind 0.0.0.0:5000 --workers 2 --daemon --log-file gunicorn.log
```

App is now accessible at `http://<EC2-PUBLIC-IP>:5000`

---

## 5. (Optional) Run as a systemd service

Create `/etc/systemd/system/food-cost.service`:

```ini
[Unit]
Description=Food Cost Tracker
After=network.target

[Service]
User=ec2-user
WorkingDirectory=/home/ec2-user/food_cost_tracker
EnvironmentFile=/home/ec2-user/food_cost_tracker/.env
ExecStart=/usr/local/bin/gunicorn wsgi:app --bind 0.0.0.0:5000 --workers 2
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable food-cost
sudo systemctl start  food-cost
```

---

## 6. (Optional) Nginx + HTTPS reverse proxy

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Then add SSL with Certbot: `sudo certbot --nginx -d yourdomain.com`

---

## Square API Keys
1. Go to https://developer.squareup.com/apps
2. Create or open an application
3. **Production** → OAuth → copy **Access Token**
4. Paste into `.env` as `SQUARE_ACCESS_TOKEN`

## SpotOn API Keys
1. Contact your SpotOn account manager or visit the SpotOn developer portal
2. Request API access for your merchant account
3. Copy the API key and base URL into `.env`

---

## Data Storage
The app stores ingredient/recipe data in `food_costs.json` (flat file).  
For production, replace with a PostgreSQL or SQLite-backed version (ask your developer).
