# Hostlane

**Hostlane** is a high-performance, multi-tenant platform designed to make static site deployments as simple as a `zip` upload. It handles the heavy lifting of versioning, symlink-based rollbacks, and Nginx orchestration so you don't have to.

---

## 🚀 Key Features

* **Atomic Deployments:** Instant rollbacks via symlink switching.
* **Multi-tenant Architecture:** Isolate sites and deployments by ID.
* **Fault-Tolerant Uploads:** Automatic recovery of interrupted deployments (handles worker crashes or server reboots).
* **High-Performance Serving:** Nginx-backed delivery with automated config management.
* **Secure Reloads:** Controlled Nginx reloads via a dedicated, root-owned helper script.
---

## 🏗 Architecture

Hostlane splits concerns between a management API and a high-speed worker:

* **API (Node.js/TS):** The brains. Manages auth, site metadata, and Nginx templates.
* **Worker (Golang):** The muscle. Fast extraction and filesystem preparation for incoming deployments.
* **Edge (Nginx):** The face. Pure, optimized static file serving.

---

## 📂 Filesystem Strategy

We use a predictable directory structure to manage site state:

```bash
/var/lib/hostlane/sites/site_<id>/
├── uploads/       # Raw .zip files
├── deployments/   # Extracted versions
│   └── v1/
│   └── v2/
└── current        # Symlink to the active deployment
```

---

## 🔄 The Lifecycle

1. **Push:** Upload a `.zip` via the API.
2. **Process:** The Go worker extracts it to a unique deployment directory.
3. **Switch:** The `current` symlink is updated. **Boom. You're live.**
4. **Rollback:** Need to go back? Point the symlink to the previous folder. No downtime.

---

## 🛠 Setup & Development

### Nginx Integration
Hostlane manages site configs in `/etc/nginx/hostlane/`. To allow the app to trigger reloads securely, add this to your sudoers:

```bash
# Allow hostlane-user to reload nginx safely
hostlane-user ALL=(root) NOPASSWD: /usr/local/bin/hostlane-nginx-reload.sh
```

### Getting Started
```bash
npm install
npm run build
npm start
```
