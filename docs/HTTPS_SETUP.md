# 🔒 HTTPS Setup mit Let's Encrypt / Certbot

## Voraussetzungen
- Domain zeigt auf deinen Server (A-Record konfiguriert)
- Port 80 + 443 offen in der Firewall

## 1. Zertifikat erstellen

```bash
docker-compose down
sudo apt install certbot
sudo certbot certonly --standalone -d deine-domain.com
docker-compose up -d
```

## 2. Nginx anpassen (nginx/nginx.conf)

HTTP → HTTPS Redirect + SSL aktivieren. Vollständige Konfiguration:
Ersetze den `server`-Block durch zwei Blöcke – einen für Port 80 (Redirect)
und einen für Port 443 (SSL). Proxy-Header `X-Forwarded-Proto https` setzen.

## 3. Zertifikate mounten (docker-compose.yml)

```yaml
nginx:
  volumes:
    - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    - /etc/letsencrypt/live/deine-domain.com/fullchain.pem:/etc/nginx/ssl/fullchain.pem:ro
    - /etc/letsencrypt/live/deine-domain.com/privkey.pem:/etc/nginx/ssl/privkey.pem:ro
  ports:
    - "80:80"
    - "443:443"
```

## 4. .env anpassen

```env
OIDC_REDIRECT_URI=https://deine-domain.com/api/auth/callback
OIDC_POST_LOGOUT_REDIRECT_URI=https://deine-domain.com
FRONTEND_URL=https://deine-domain.com
```

## 5. Auto-Renewal (Cron)

```bash
0 3 * * * certbot renew --quiet && docker-compose restart nginx
```
