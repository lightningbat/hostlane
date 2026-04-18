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

```text
/var/lib/hostlane/
├── config/             # Generated Nginx site configs (Staging)
└── sites/
    └── site_<id>/
        ├── uploads/    # Deployment artifacts (.zip)
        ├── deployments/# Extracted versions
        └── current -> deployments/deploy_<id>
```

---

## 🔄 The Lifecycle

1. **Push:** Upload a `.zip` via the API.
2. **Process:** The Go worker extracts it to a unique deployment directory.
3. **Switch:** The `current` symlink is updated. **Boom. You're live.**
4. **Rollback:** Need to go back? Point the symlink to the previous folder. No downtime.

---

## ⚙️ Installation & Setup

### 1. Storage Configuration
By default, Hostlane uses `/var/lib/hostlane/` for deployments and configuration. You can override this by setting `ROOT_STORAGE` in your `.env` file.

You must create the directory and grant ownership to the user running the API server:
```bash
sudo mkdir -p /var/lib/hostlane/{sites,config}
sudo chown -R <app-user>:<app-user> /var/lib/hostlane/
```
* **sites/**: Stores uploads and extracted deployments.
* **config/**: Acts as a staging area where the server generates Nginx configs before they are synced to the system.

### 2. Nginx Helper Script
The system requires a dedicated script to validate and reload Nginx. Copy it from the source to your local bin:

```bash
sudo cp scripts/hostlane-nginx-reload.sh /usr/local/bin/
sudo chmod +x /usr/local/bin/hostlane-nginx-reload.sh
```

Then, allow the app user to execute it without a password prompt by adding this to `visudo`:
```bash
<app-user> ALL=(root) NOPASSWD: /usr/local/bin/hostlane-nginx-reload.sh
```

### 3. SSL Configuration
Hostlane expects a wildcard SSL configuration for site delivery. Create a snippet at `/etc/nginx/snippets/ssl-wildcard.conf`:

```nginx
# /etc/nginx/snippets/ssl-wildcard.conf
ssl_certificate /path/to/your/fullchain.pem;
ssl_certificate_key /path/to/your/privkey.pem;
```

---

## 🛠 Building from Source

**Prerequisites:**
* Node.js (v18+)
* Go (1.20+)

Run the build script from the project root:

```bash
# Make the script executable
chmod +x scripts/build.sh

# Run the build
./scripts/build.sh
```
