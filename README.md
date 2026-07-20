# MikroTik Captive Portal + WiFi Controller

A self-hosted captive portal backend for school networks, built with **Next.js 14**, **Prisma/SQLite**, and **MikroTik RouterOS API** integration. Students on a dedicated VLAN authenticate through the portal; an admin approves registrations and manages devices via a web dashboard.

## Architecture

```
              Internet
                 |
              ether1  (DHCP client, NAT masquerade)
         ┌──── MikroTik ────┐
         │ ether2 (trunk)   │  802.1Q tagged: 10, 20, 30
         └────────┬─────────┘
                  │
         ┌────────┴──────────┐
         │   Managed switch  │
         └─┬───────┬───────┬─┘
        VLAN 10  VLAN 20  VLAN 30
      Servers   Staff    Students (captive portal)

  VLAN 10  192.168.10.0/24   gw .1   Backend server @ .10 (static)
  VLAN 20  192.168.20.0/24   gw .1   Staff — no portal
  VLAN 30  192.168.30.0/24   gw .1   Students — hotspot + external login
```

## How It Works

1. A student device on VLAN 30 connects to WiFi and gets a DHCP address.
2. The MikroTik hotspot intercepts HTTP and redirects to the captive portal.
3. The student submits their Student ID via the portal form.
4. The backend registers the device (MAC address) and sets status to **PENDING**.
5. An admin reviews the request at `/admin` and approves or denies it.
6. On approval, the backend adds a MAC-based bypass on the MikroTik hotspot — the student now has internet access.
7. Additional devices require a new approval cycle per device.

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Database | SQLite via Prisma ORM 5.20 |
| Auth (admin) | iron-session + argon2id |
| Router integration | node-routeros (RouterOS API on TCP 8728) |
| Styling | Tailwind CSS |
| Validation | Zod |

## Database Schema

Four models managed by Prisma:

- **Student** — `studentId`, `nama`, `kelas`, `status` (PENDING / ACTIVE / DENIED)
- **Device** — `macAddress`, `hostname`, linked to Student, `approved` boolean
- **AdminUser** — `email`, `passwordHash` (argon2id)
- **AuditLog** — `actor`, `action`, `target`, `meta`

## Project Structure

```
├── src/
│   ├── app/              # Next.js App Router (pages + API routes)
│   │   ├── api/          # REST endpoints (captive, login, admin/*)
│   │   └── admin/        # Admin dashboard UI
│   ├── lib/              # Shared modules (mikrotik, auth, db, etc.)
│   └── middleware.ts     # Admin route protection + VLAN block
├── prisma/
│   ├── schema.prisma     # Database schema
│   └── migrations/       # Migration history
├── scripts/
│   └── create-admin.ts   # Interactive admin user creation
├── nginx/                # Optional nginx reverse proxy config
├── systemd/              # systemd service unit
├── docs/
│   ├── DEPLOY.md         # Backend server deployment guide
│   ├── README.md         # Legacy project overview
│   └── config.rsc        # MikroTik RouterOS config export
├── tests/                # Test files
├── Dockerfile            # Multi-stage Docker build
└── .env                  # Environment variables (not committed)
```

---

## Deployment Guide

You need two things: a **MikroTik router** configured with VLANs and a hotspot, and a **backend server** running the Next.js app. Deploy the router first, then the server.

### Prerequisites

- MikroTik router running RouterOS 7.x
- Managed switch with VLAN support (or RouterOS doing VLAN tagging on bridge ports)
- A server (physical or VM) on VLAN 10 for the backend
- Ubuntu Server 22.04+ (or any Linux with systemd)
- Node.js 22+ (or Docker)

---

### Part 1 — MikroTik Router Setup

#### 1.1 Apply the Router Configuration

The file `docs/config.rsc` is a full RouterOS export that sets up:

- **3 VLANs** on a bridge with VLAN filtering (VLAN 10 = servers, 20 = staff, 30 = students)
- **DHCP servers** for each VLAN
- **Firewall rules** — allows VLAN 30 to reach the portal server (192.168.10.10:80), blocks other cross-VLAN traffic
- **Hotspot** on VLAN 30 with MAC-based auth + HTTP PAP login
- **Walled garden** — permits VLAN 30 devices to reach the portal server (192.168.10.10:80/443) and DNS before authentication
- **API service** — enabled on TCP 8728, restricted to 192.168.10.0/24
- **API user** — `portal-api` with limited permissions (read, write, api, policy, test, sensitive)

Upload and run it via WinBox, SSH, or terminal:

```
/import file-name=config.rsc
```

> **Important:** Review `docs/config.rsc` and adjust interface names (`ether1`-`ether4`), IP addresses, MAC addresses, and DHCP pools to match your hardware before applying. The config assumes `ether1` = WAN, `ether2` = VLAN 10 server port, `ether3` = VLAN 20 staff port, `ether4` = VLAN 30 student port.

#### 1.2 Verify the Router

After applying the config, verify:

```
/interface print
/ip address print
/ip hotspot print
/ip service print
/user print
```

Confirm:
- `api` service is enabled and bound to `192.168.10.0/24`
- Hotspot `hs-vlan30` is active on `vlan30-students`
- The `portal-api` user exists

#### 1.3 Key MikroTik Concepts

| Item | Value |
|------|-------|
| Hotspot DNS name | `hotspot.school.lan` |
| Hotspot address | `192.168.30.1` |
| Hotspot profile | `students-hsprof` (MAC + HTTP PAP) |
| Hotspot user profile | `student-profile` |
| API port | TCP 8728 |
| API credentials | `portal-api` / `mikroapi` |
| Walled garden | Allows 192.168.10.10:80/443 and DNS |

---

### Part 2 — Backend Server Setup

The backend runs on a server at **192.168.10.10** on VLAN 10.

#### Option A: Docker Deployment

```bash
git clone <your-repo-url> /opt/captive-portal
cd /opt/captive-portal
```

Create your `.env` file:

```bash
cp .env.example .env   # or create manually
```

Fill in `.env` (see [Environment Variables](#environment-variables) below).

Build and run:

```bash
docker build -t captive-portal .
docker run -d \
  --name captive-portal \
  --env-file .env \
  --restart unless-stopped \
  -p 80:80 \
  captive-portal
```

The entrypoint script automatically runs `prisma migrate deploy` on container start, then launches the app. For subsequent deployments with schema changes, just rebuild the image — migrations apply on startup.

**Creating the first admin user (Docker):**

The `create-admin` script needs `tsx` (devDependency, not in production image). Create the admin **before** building the image:

```bash
# Install deps locally (including dev for tsx)
npm ci --include=dev

# Create your .env with DATABASE_URL="file:./prisma/prod.db"
cp .env.example .env && nano .env

# Run migrations locally to create the DB
./node_modules/.bin/prisma migrate deploy
./node_modules/.bin/prisma generate

# Create admin user (interactive prompt)
npm run create-admin

# Now build Docker — the image won't include prod.db (it's in .dockerignore),
# so mount the prisma/ directory or copy prod.db into the container at runtime.
```

Alternatively, skip Docker for admin creation and use the **systemd** path (Option B) which handles everything natively.

#### Option B: Manual / systemd Deployment

##### 1. Static IP

Create `/etc/netplan/00-portal.yaml`:

```yaml
network:
  version: 2
  ethernets:
    eth0:
      dhcp4: false
      addresses: [192.168.10.10/24]
      routes:
        - to: default
          via: 192.168.10.1
      nameservers:
        addresses: [192.168.10.1, 1.1.1.1]
```

```bash
sudo netplan apply
ping -c2 192.168.10.1
```

##### 2. Install Node.js and System User

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs build-essential

sudo useradd --system --create-home --shell /usr/sbin/nologin portal
sudo mkdir -p /opt/captive-portal && sudo chown portal:portal /opt/captive-portal
```

Copy the project files into `/opt/captive-portal/` (via `git clone`, `rsync`, or `scp`).

##### 3. Install Dependencies

```bash
sudo chown -R portal:portal /opt/captive-portal

# Install with dev dependencies (needed for Prisma CLI and tsx)
sudo -u portal bash -lc 'cd /opt/captive-portal && npm ci --include=dev'
```

##### 4. Configure Environment

```bash
sudo -u portal cp /opt/captive-portal/.env.example /opt/captive-portal/.env
sudo -u portal nano /opt/captive-portal/.env
```

Generate a session secret:

```bash
openssl rand -base64 48
```

Paste the output as the `SESSION_SECRET` value.

##### 5. Database Migration + Admin User

```bash
sudo chown -R portal:portal /opt/captive-portal

# Use the local Prisma binary (not npx — avoids Prisma 7 conflicts)
sudo -u portal ./node_modules/.bin/prisma migrate deploy
sudo -u portal ./node_modules/.bin/prisma generate

# Create the first admin account (interactive prompt)
sudo -u portal npm run create-admin
```

> **Troubleshooting:** If you see `unable to open database file: ./prod.db`, fix ownership:
> ```bash
> sudo install -d -o portal -g portal /opt/captive-portal/prisma
> sudo chown -R portal:portal /opt/captive-portal
> sudo -u portal ./node_modules/.bin/prisma migrate deploy
> ```

##### 6. Build and Start

```bash
sudo -u portal npm run build
```

##### 7. systemd Service

```bash
sudo cp /opt/captive-portal/systemd/captive-portal.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now captive-portal
sudo journalctl -u captive-portal -f
```

The service runs as the `portal` user, binds to port 80 via `CAP_NET_BIND_SERVICE`, reads `.env`, and auto-restarts on failure.

##### 8. Optional: nginx Reverse Proxy

If you need TLS on admin pages or want nginx in front:

```bash
sudo apt-get install -y nginx
sudo cp /opt/captive-portal/nginx/captive-portal.conf /etc/nginx/sites-available/captive-portal
sudo ln -s /etc/nginx/sites-available/captive-portal /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

> **Important:** Captive portal endpoints (`/api/captive`, `/api/login`, `/api/denied`) **must** remain reachable over plain HTTP. Captive-portal detection does not work with TLS.

---

### Part 3 — Verification

#### From the backend server itself:

```bash
curl -i http://127.0.0.1/api/captive
curl -i http://127.0.0.1/api/denied
```

#### From a VLAN 30 device (before login):

```bash
curl -i http://wifi-controller/api/captive
```

This must return the portal HTML (walled garden is working).

#### End-to-end test:

1. Open `http://neverssl.com` on a student device (VLAN 30).
2. The hotspot should redirect to the captive portal.
3. Submit a Student ID.
4. Admin signs in at `http://wifi-controller/admin/login`.
5. Approve the pending registration.
6. The student device should now reach the internet without re-prompting.

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORTAL_PUBLIC_URL` | Yes | — | Public URL of the portal (e.g., `http://192.168.10.10`) |
| `DATABASE_URL` | Yes | — | Prisma DB URL (e.g., `file:./prod.db` for SQLite) |
| `MIKROTIK_HOST` | Yes | — | Router IP (e.g., `192.168.10.1`) |
| `MIKROTIK_PORT` | No | `8728` | RouterOS API port |
| `MIKROTIK_API_USER` | Yes | — | API username (e.g., `portal-api`) |
| `MIKROTIK_API_PASS` | Yes | — | API password |
| `MIKROTIK_CONNECT_TIMEOUT_MS` | No | `10000` | Connection timeout (ms) |
| `MIKROTIK_COMMAND_TIMEOUT_MS` | No | `20000` | Per-command timeout (ms) |
| `MIKROTIK_SOCKET_TIMEOUT_SEC` | No | `30` | Socket timeout (seconds) |
| `MIKROTIK_MAX_RETRIES` | No | `2` | Max retries per command |
| `MIKROTIK_CIRCUIT_THRESHOLD` | No | `5` | Failures before circuit breaker trips |
| `MIKROTIK_CIRCUIT_COOLDOWN_MS` | No | `30000` | Circuit breaker cooldown (ms) |
| `MIKROTIK_HOTSPOT_USER_PROFILE` | No | `student-profile` | MikroTik hotspot user profile name |
| `HOTSPOT_GATEWAY_URL` | No | `http://192.168.30.1/status` | Where to redirect after login |
| `SESSION_SECRET` | Yes | — | iron-session secret (32+ chars, use `openssl rand -base64 48`) |
| `SESSION_COOKIE_NAME` | No | `cp_admin` | Admin session cookie name |
| `NODE_ENV` | No | `production` | Node environment |

---

## NPM Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server on port 3000 |
| `npm run build` | Generate Prisma client + build Next.js |
| `npm start` | Start production server on port 80 |
| `npm run lint` | Run ESLint |
| `npm run create-admin` | Interactive admin user creation |
| `npm run prisma:migrate` | Deploy database migrations |
| `npm run prisma:studio` | Open Prisma Studio (DB browser) |

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Portal never appears | Some OSes only probe HTTPS. Use `http://neverssl.com` for testing. |
| Portal loads but `/api/login` returns 502 | Backend unreachable from VLAN 30. Check firewall: `forward: vlan30 -> wifi-controller accept`. |
| IP binding added but device still sees portal | Confirm binding is `type=bypassed` and hotspot host entry was removed. Client may need page reload. |
| MAC formatting issues | All MACs go through `src/lib/mac.ts::normalize()` — uppercase, colon-separated. Never store raw. |
| Router API refuses connection | Run `/ip service print` — confirm `api` is enabled and address-list includes `192.168.10.0/24`. |
| Router API calls hang/timeout | Check `MIKROTIK_*_TIMEOUT_MS` in `.env`. Ensure TCP 8728 is allowed on the router input chain. Circuit breaker opens after 5 consecutive failures. |
| `unable to open database file` | Fix ownership: `sudo chown -R portal:portal /opt/captive-portal` |
| `You defined the enum StudentStatus` | Server has an older `schema.prisma`. Re-copy updated files — current schema uses string status, not enum. |

---

## Backup

SQLite database lives at `/opt/captive-portal/prisma/prod.db`. Snapshot nightly:

```bash
sudo -u portal sqlite3 /opt/captive-portal/prisma/prod.db \
  ".backup '/var/backups/portal-$(date +%F).db'"
```

---

## License

See LICENSE file if present.
