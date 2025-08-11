```markdown
# 🎬 HomelabFlix

A **Netflix-style dashboard** for your Homelab — monitor containers, network gear, and services with a slick, tile-based UI.  
Designed for **easy integration**: just add the IP, login, and/or API key for a tool, and HomelabFlix will start monitoring it.

---

## 🚀 Features

- **Beautiful Netflix-like UI** built with React + Tailwind + shadcn/ui
- **20+ popular homelab tools** ready to configure out of the box
- **Easy Quick-Setup** — add IP, credentials, and API keys in seconds
- **Settings Page** to control refresh rate and display preferences
- **Fastify Backend** for API aggregation & secure credential storage
- **Extensible** — easily add new tools, metrics, or widgets
- **Production-ready structure** (`client` + `server` folders)

---

## 📂 Project Structure

```
homelabflix/
├── client/         # React + Vite front-end
│   ├── src/
│   └── vite.config.ts
├── server/         # Fastify backend
│   ├── src/
│   └── .env.example
├── public/
├── README.md
└── package.json
```

---

## 🛠️ Tech Stack

**Frontend**
- [React](https://react.dev/) + [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/) components

**Backend**
- [Fastify](https://fastify.dev/) API server
- [@fastify/cors](https://github.com/fastify/fastify-cors) for cross-origin requests
- [dotenv](https://github.com/motdotla/dotenv) for environment variables

---

## ⚡ Quick Start

### 1️⃣ Clone the Repo
```bash
git clone https://github.com/YOUR_USERNAME/HomelabFlix.git
cd HomelabFlix
```

### 2️⃣ Setup the Server
```bash
cd server
cp .env.example .env
npm install
npm run dev
```
By default, the API runs at `http://localhost:8787`

### 3️⃣ Setup the Client
```bash
cd ../client
npm install
npm run dev
```
The frontend runs at `http://localhost:5173` and proxies `/api` calls to the server.

---

## ⚙️ Configuration

1. Open the **Settings Page** in the UI.
2. Add IP addresses, credentials, and/or API keys for your tools.
3. Choose refresh intervals and other preferences.
4. Done — tiles start updating automatically.

---

## 🧩 Supported Tools (Initial 20)
- Proxmox
- TrueNAS
- Docker
- Portainer
- Grafana
- Prometheus
- Uptime Kuma
- Pi-hole
- Home Assistant
- Nginx Proxy Manager
- ... and more (full list in `/server/config/tools.ts`)

---

## 📦 Building for Production

```bash
# Server
cd server
npm run build

# Client
cd ../client
npm run build
```

Deploy the `/server/dist` folder along with `/client/dist` on your preferred environment.

---

## 🛣️ Roadmap

- 🔐 Secure credential storage & encryption
- 📡 Real-time tile updates with SSE/WebSockets
- 🖥️ More connectors & monitoring integrations
- 📱 Mobile-friendly UI
- 🌐 Multi-user support

---

## 🤝 Contributing

Pull requests are welcome!  
Please fork the repo and create a feature branch:
```bash
git checkout -b feature/my-new-feature
```

---

## 📜 License

MIT License © 2025 Dominik Gnepf
```
