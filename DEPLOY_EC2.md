# Deploy To EC2

This repo is prepared to run on a Linux EC2 instance using:

- Amazon EC2
- `systemd` for process supervision
- `nginx` as the reverse proxy
- PostgreSQL via `DATABASE_URL`

The app now builds with Next.js standalone output, exposes a health endpoint at `/api/health`, and includes EC2 service templates in [`deploy/ec2`](./deploy/ec2).

## Recommended shape

- EC2 instance for the app
- Security group allowing:
  - `22` from your admin IP only
  - `80` and `443` from the internet
- PostgreSQL on Amazon RDS or another managed Postgres instance
- Optional: terminate TLS with an ALB or with `nginx` + Certbot on the instance

## 1. Launch the instance

Amazon Linux 2023 is a good default. Point DNS to the instance or to an ALB in front of it.

## 2. Install system packages

Run on the EC2 host:

```bash
sudo dnf update -y
sudo dnf install -y nodejs git nginx
node -v
npm -v
```

If you want a pinned Node version instead of the distro package, install Node 22 LTS with your usual runtime manager.

## 3. Copy the app to the server

Example target path:

```bash
sudo mkdir -p /opt/ro-accountability
sudo chown -R ec2-user:ec2-user /opt/ro-accountability
cd /opt/ro-accountability
git clone <your-repo-url> current
cd current
```

## 4. Create the runtime env file

Create `/etc/ro-accountability.env`:

```bash
sudo tee /etc/ro-accountability.env > /dev/null <<'EOF'
NODE_ENV=production
HOSTNAME=0.0.0.0
PORT=3000
NEXTAUTH_URL=https://your-domain.example.com
AUTH_SECRET=replace-with-a-long-random-string
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/ro_accountability?schema=public
SEED_MANAGER_EMAIL=manager@example.com
SEED_MANAGER_PASSWORD=replace-this
SEED_MANAGER_NAME=Initial Manager
EOF
```

`AUTH_SECRET` should be long and random.

## 5. Install dependencies, migrate, seed, and build

From `/opt/ro-accountability/current`:

```bash
npm ci
npx prisma migrate deploy
npm run db:seed
npm run build:ec2
```

`npm run build:ec2` produces a runtime bundle in `.deploy/standalone`.

If you only want to seed the manager account once, skip `npm run db:seed` on later deployments.

## 6. Install the systemd service

Copy the included unit file:

```bash
sudo cp deploy/ec2/ro-accountability.service /etc/systemd/system/ro-accountability.service
sudo systemctl daemon-reload
sudo systemctl enable ro-accountability
sudo systemctl start ro-accountability
sudo systemctl status ro-accountability
```

Check logs:

```bash
journalctl -u ro-accountability -f
```

## 7. Configure nginx

Copy the included nginx config:

```bash
sudo cp deploy/ec2/nginx-ro-accountability.conf /etc/nginx/conf.d/ro-accountability.conf
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl restart nginx
```

This template proxies traffic to `127.0.0.1:3000`.

## 8. Verify the deployment

From the instance:

```bash
curl http://127.0.0.1:3000/api/health
curl http://127.0.0.1/api/health
```

Expected response:

```json
{"service":"ro-accountability","status":"ok","timestamp":"..."}
```

## Update flow

For a simple manual deployment:

```bash
cd /opt/ro-accountability/current
git pull
npm ci
npx prisma migrate deploy
npm run build:ec2
sudo systemctl restart ro-accountability
```

Run `npm run db:seed` only when you intentionally want to create or re-activate the configured manager account.

## Files added for EC2

- [`next.config.ts`](./next.config.ts): enables standalone output
- [`app/api/health/route.ts`](./app/api/health/route.ts): health check endpoint
- [`scripts/prepare-standalone.sh`](./scripts/prepare-standalone.sh): assembles the runtime bundle
- [`deploy/ec2/ro-accountability.service`](./deploy/ec2/ro-accountability.service): `systemd` service
- [`deploy/ec2/nginx-ro-accountability.conf`](./deploy/ec2/nginx-ro-accountability.conf): reverse proxy template
