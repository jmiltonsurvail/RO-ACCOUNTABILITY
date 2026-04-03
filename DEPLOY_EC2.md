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
sudo dnf install -y git nginx
sudo dnf list available 'nodejs*'
sudo dnf install -y nodejs20
node -v
npm -v
```

Do not install the generic `nodejs` package if it gives you Node 18. This app requires Node `20.9+`.

If `nodejs20` is not available in your image or repository configuration, install Node 22 LTS instead, then re-run `node -v` and confirm it is `>= 20.9.0`.

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
set -a
source /etc/ro-accountability.env
set +a
npm run db:seed
npm run build:ec2
```

`npm run build:ec2` produces a runtime bundle in `.deploy/standalone`.

If you only want to seed the manager account once, skip `npm run db:seed` on later deployments.

The important detail is that the seed command must run with the same `SEED_MANAGER_*` values in the shell environment. The app service reads `/etc/ro-accountability.env` through `systemd`, but a manual `npm run db:seed` does not unless you source that file first.

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

## Cloudflare HTTPS

If you use Cloudflare, the simplest production setup is:

- DNS record proxied through Cloudflare
- Cloudflare SSL/TLS mode set to `Full (strict)`
- Cloudflare Origin CA certificate installed on the EC2 instance
- `nginx` listening on `443` with that origin certificate

### 1. Make sure the DNS record is proxied

In Cloudflare DNS, point your hostname to the EC2 public IP and enable the orange-cloud proxy.

### 2. Create a Cloudflare Origin Certificate

In Cloudflare:

- Go to `SSL/TLS`
- Open `Origin Server`
- Create a certificate
- Include the hostname you will serve, for example `example.com` and `www.example.com`

Save the certificate and private key.

### 3. Install the certificate on the EC2 instance

```bash
sudo mkdir -p /etc/ssl/cloudflare
sudo chmod 700 /etc/ssl/cloudflare
sudo vi /etc/ssl/cloudflare/origin-cert.pem
sudo vi /etc/ssl/cloudflare/origin-key.pem
sudo chmod 600 /etc/ssl/cloudflare/origin-cert.pem /etc/ssl/cloudflare/origin-key.pem
```

### 4. Replace the nginx HTTP-only config with the Cloudflare TLS config

Edit the provided template in [`deploy/ec2/nginx-ro-accountability-cloudflare-origin-ca.conf`](./deploy/ec2/nginx-ro-accountability-cloudflare-origin-ca.conf) and replace:

- `example.com`
- `www.example.com`

Then install it:

```bash
sudo cp deploy/ec2/nginx-ro-accountability-cloudflare-origin-ca.conf /etc/nginx/conf.d/ro-accountability.conf
sudo nginx -t
sudo systemctl reload nginx
```

### 5. Open port 443 on the EC2 security group

Allow inbound `443`. If you want the fastest path, allow it from the internet first, then tighten it later.

### 6. Set Cloudflare SSL mode

In Cloudflare `SSL/TLS`, set encryption mode to `Full (strict)`.

### 7. Force HTTPS at the edge

In Cloudflare `SSL/TLS`, enable `Always Use HTTPS`.

### 8. Verify

From the EC2 host:

```bash
curl -kI https://127.0.0.1/api/health
```

From your machine:

```bash
curl -I https://example.com/api/health
```

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

## Troubleshooting

### `npm` / Prisma install dies during `@prisma/client` postinstall

If you see Node `18.x`, fix Node first. A failing Prisma postinstall on this app is usually a symptom of the unsupported runtime, not the root cause.

Check:

```bash
node -v
npm -v
```

If the server is on Node 18, replace it with Node 20+:

```bash
sudo dnf remove -y nodejs npm
sudo dnf clean all
sudo dnf list available 'nodejs*'
sudo dnf install -y nodejs20
node -v
```

Then rerun:

```bash
npm ci
npx prisma migrate deploy
set -a
source /etc/ro-accountability.env
set +a
npm run db:seed
npm run build:ec2
```

### `npm install -g npm@11` fails with `EBADENGINE`

That error is expected on Node 18. `npm@11` requires a newer Node version. Do not try to solve this by upgrading npm first. Upgrade Node first.

## Update flow

For a repeatable one-command update on EC2:

```bash
cd /opt/ro-accountability/current
npm run deploy:ec2:update
```

That script will:

- pull the latest `main`
- run `npm ci`
- run `npx prisma migrate deploy`
- build the standalone bundle
- restart `ro-accountability`

It also loads `/etc/ro-accountability.env` automatically if that file exists.

For a simple manual deployment:

```bash
cd /opt/ro-accountability/current
git pull
npm ci
npx prisma migrate deploy
set -a
source /etc/ro-accountability.env
set +a
npm run db:seed
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
- [`deploy/ec2/nginx-ro-accountability-cloudflare-origin-ca.conf`](./deploy/ec2/nginx-ro-accountability-cloudflare-origin-ca.conf): Cloudflare Origin CA TLS template
