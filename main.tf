terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.117"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}

provider "azurerm" {
  features {}
}

# -------------------------
# Variables
# -------------------------

variable "location" {
  description = "Azure deployment region"
  type        = string
  default     = "Southeast Asia"
}

variable "vm_size" {
  description = "Lowest-cost starting configuration"
  type        = string
  default     = "Standard_B1ms"
}

variable "ssh_allowed_cidr" {
  description = "Your public IP/CIDR for SSH. Empty disables SSH."
  type        = string
  default     = ""
}

variable "admin_username" {
  type    = string
  default = "azureuser"
}

variable "disk_size_gb" {
  type    = number
  default = 32
}

variable "app_admin_email" {
  description = "Email of the administrator account created during provisioning"
  type        = string
  default     = "admin@example.test"
}

variable "app_admin_name" {
  description = "Display name of the administrator account"
  type        = string
  default     = "Administrator"
}

variable "claim_user_email" {
  description = "Email of the demo client (claim) account created during provisioning"
  type        = string
  default     = "claimer@example.test"
}

variable "claim_user_name" {
  description = "Display name of the demo client (claim) account"
  type        = string
  default     = "Claim Tester"
}

variable "analyst_email" {
  description = "Email of the analyst account created during provisioning"
  type        = string
  default     = "analyst@example.test"
}

variable "analyst_name" {
  description = "Display name of the analyst account"
  type        = string
  default     = "Sarah Analyst"
}

# -------------------------
# Random credentials
# -------------------------

resource "random_password" "db_password" {
  length  = 32
  special = false
}

resource "random_password" "db_root_password" {
  length  = 40
  special = false
}

resource "random_password" "vm_password" {
  length           = 24
  special          = true
  override_special = "!@#%^*-_=+"
}

# Alphanumeric only: the value is interpolated into the provisioning script and
# piped to the application's create-admin command, so avoid shell metacharacters.
resource "random_password" "app_admin_password" {
  length  = 28
  special = false
}

# Claim (client) demo account: alphanumeric so it is safe to interpolate into
# the cloud-init script and send to the public register endpoint as JSON.
resource "random_password" "claim_user_password" {
  length  = 28
  special = false
}

# Analyst demo account: same constraints as the admin password.
resource "random_password" "analyst_password" {
  length  = 28
  special = false
}

# Shared password for the additional demo clients/analysts seeded below.
resource "random_password" "demo_password" {
  length  = 28
  special = false
}

# -------------------------
# Deployment status page
# -------------------------

locals {
  # Served by a host-level nginx as soon as the VM boots, before the Docker
  # stack exists. It reads status.json/events.log written by the provisioning
  # script, so progress is visible even while images are still building.
  deploy_status_page = <<-HTML
    <!DOCTYPE html>
    <html lang="en">
    <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>HealthGuard deployment status</title>
    <style>
    *{box-sizing:border-box}
    body{margin:0;font-family:Inter,system-ui,Segoe UI,Arial,sans-serif;background:#f3f7f6;color:#18332f;display:grid;place-items:center;min-height:100vh;padding:24px}
    main{width:100%;max-width:760px}
    .eyebrow{letter-spacing:.18em;font-size:.72rem;font-weight:700;color:#527468;text-transform:uppercase;margin:0 0 6px}
    h1{margin:0 0 18px;font-size:clamp(1.6rem,4vw,2.2rem)}
    .card{background:#fff;border:1px solid #d3dfdb;border-radius:14px;padding:22px;box-shadow:0 8px 24px rgba(20,62,48,.06)}
    .row{display:flex;justify-content:space-between;gap:12px;font-weight:700}
    .bar{height:12px;background:#e6efec;border-radius:999px;margin:14px 0;overflow:hidden}
    #fill{height:100%;width:0;background:linear-gradient(90deg,#116b57,#2f9e7f);transition:width .5s ease}
    #message{margin:0 0 10px;font-size:1rem}
    .meta{margin:0;color:#4d6660;font-size:.85rem}
    .pill{display:inline-block;margin:14px 0 0;padding:6px 12px;border-radius:999px;background:#eef4f2;font-size:.85rem;font-weight:600}
    .pill.ok{background:#e7f7eb;color:#18532c}
    .pill.bad{background:#fff1ef;color:#8c241c}
    .button{display:inline-block;margin-top:16px;padding:10px 16px;border-radius:8px;background:#116b57;color:#fff;text-decoration:none;font-weight:700}
    .hidden{display:none}
    h2{font-size:.95rem;color:#4d6660;margin:22px 0 8px}
    pre{background:#0f2c25;color:#d7efe6;border-radius:10px;padding:14px;font-size:.8rem;line-height:1.5;max-height:260px;overflow:auto;margin:0}
    </style>
    </head>
    <body>
    <main>
      <p class="eyebrow">HealthGuard</p>
      <h1>Deployment status</h1>
      <section class="card">
        <div class="row"><span id="stage">starting</span><span id="pct">0%</span></div>
        <div class="bar"><div id="fill"></div></div>
        <p id="message">Waiting for the provisioning script...</p>
        <p class="meta">Started <strong id="started">-</strong> &middot; Updated <strong id="updated">-</strong></p>
        <p id="app" class="pill">Application: checking...</p>
        <a id="open" class="button hidden" href="/">Open HealthGuard</a>
      </section>
      <h2>Live progress log</h2>
      <pre id="log">Waiting for the first update...</pre>
    </main>
    <script>
    (function () {
      var stageEl = document.getElementById("stage");
      var pctEl = document.getElementById("pct");
      var fillEl = document.getElementById("fill");
      var msgEl = document.getElementById("message");
      var startedEl = document.getElementById("started");
      var updatedEl = document.getElementById("updated");
      var appEl = document.getElementById("app");
      var openEl = document.getElementById("open");
      var logEl = document.getElementById("log");
      var lastReady = false;

      function loadStatus() {
        fetch("/deploy-status.json", { cache: "no-store" })
          .then(function (r) { return r.json(); })
          .then(function (s) {
            stageEl.textContent = s.stage;
            pctEl.textContent = s.progress + "%";
            fillEl.style.width = Math.max(0, Math.min(100, Number(s.progress) || 0)) + "%";
            msgEl.textContent = s.message;
            startedEl.textContent = s.started_at || "-";
            updatedEl.textContent = s.updated_at || "-";
            lastReady = s.ready === true;
            if (lastReady) { openEl.classList.remove("hidden"); }
          })
          .catch(function () {
            msgEl.textContent = "Provisioning has not started yet, or the status file is temporarily unavailable.";
          });
      }

      function loadLog() {
        fetch("/deploy-status.log", { cache: "no-store" })
          .then(function (r) { return r.text(); })
          .then(function (t) {
            logEl.textContent = t || "No progress entries yet.";
            logEl.scrollTop = logEl.scrollHeight;
          })
          .catch(function () {});
      }

      function loadHealth() {
        fetch("/healthz", { cache: "no-store" })
          .then(function (r) {
            var ok = r.ok;
            appEl.textContent = "Application: " + (ok ? "online" : "starting");
            appEl.className = "pill " + (ok ? "ok" : "bad");
            if (ok && lastReady) { openEl.classList.remove("hidden"); }
          })
          .catch(function () {
            appEl.textContent = "Application: starting";
            appEl.className = "pill bad";
          });
      }

      loadStatus(); loadLog(); loadHealth();
      setInterval(function () {
        loadStatus();
        if (!lastReady) { loadLog(); }
        loadHealth();
      }, 4000);
    })();
    </script>
    </body>
    </html>
  HTML

  # Host nginx: port 80 is owned by this status/proxy server, the containers
  # stay on loopback 8080. While the app is not listening, "/" shows the
  # status page instead of a connection error.
  deploy_status_nginx = <<-NGINX
    server {
        listen 80;
        listen [::]:80;
        server_name _;

        root /var/www/healthguard-status;

        location = /deploy-status {
            try_files /index.html =404;
            add_header Cache-Control "no-store";
        }

        location = /deploy-status.json {
            alias /var/www/healthguard-status/status.json;
            default_type application/json;
            add_header Cache-Control "no-store";
        }

        location = /deploy-status.log {
            alias /var/www/healthguard-status/events.log;
            default_type text/plain;
            add_header Cache-Control "no-store";
        }

        location = /healthz {
            proxy_pass http://127.0.0.1:8080/healthz;
            proxy_set_header Host $http_host;
            proxy_connect_timeout 3s;
            proxy_read_timeout 60s;
        }

        location / {
            proxy_pass http://127.0.0.1:8080;
            proxy_http_version 1.1;
            proxy_set_header Host $http_host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_connect_timeout 3s;
            proxy_read_timeout 1800s;
            proxy_send_timeout 1800s;
            error_page 502 503 504 =200 /deploy-status;
        }
    }
  NGINX

  # Copied into the backend container at the end of provisioning and executed
  # with `php artisan db:seed`. It uses the application services so claim
  # history, sequences and notifications are created exactly as in the UI.
  demo_seeder_php = <<-PHP
    <?php

    namespace Database\Seeders;

    use App\Models\ClaimMessage;
    use App\Models\User;
    use App\Services\ClaimService;
    use Illuminate\Database\Seeder;
    use Illuminate\Support\Facades\Hash;

    class DeploymentDemoSeeder extends Seeder
    {
        public function run(): void
        {
            if (User::where('email', 'client1@example.test')->exists()) {
                echo "Deployment demo data already present; skipping.\n";

                return;
            }

            $password = getenv('DEMO_SEED_PASSWORD');
            if (! is_string($password) || strlen($password) < 8) {
                throw new \RuntimeException('DEMO_SEED_PASSWORD must be at least 8 characters.');
            }

            $claims = app(ClaimService::class);

            $analystDefs = [
                ['name' => 'Dr. Maya Sari', 'email' => 'analyst1@example.test'],
                ['name' => 'Dimas Prakoso', 'email' => 'analyst2@example.test'],
                ['name' => 'Rina Wijaya', 'email' => 'analyst3@example.test'],
            ];

            $clientDefs = [
                ['name' => 'Budi Santoso', 'email' => 'client1@example.test', 'phone' => '081234567890',
                    'address' => 'Jl. Sudirman No. 21, Jakarta', 'date_of_birth' => '1990-04-12', 'bpjs_number' => '0001234567890'],
                ['name' => 'Siti Nurhaliza', 'email' => 'client2@example.test', 'phone' => '082345678901',
                    'address' => 'Jl. Asia Afrika No. 8, Bandung', 'date_of_birth' => '1985-09-23', 'bpjs_number' => '0009876543210'],
                ['name' => 'Andi Saputra', 'email' => 'client3@example.test', 'phone' => '083456789012',
                    'address' => 'Jl. Pemuda No. 45, Surabaya', 'date_of_birth' => '1978-01-30', 'bpjs_number' => '0005556667778'],
            ];

            $analysts = [];
            foreach ($analystDefs as $def) {
                $analysts[] = User::create([
                    'name' => $def['name'],
                    'email' => $def['email'],
                    'password' => Hash::make($password),
                    'role' => 'analyst',
                ]);
            }

            $clients = [];
            foreach ($clientDefs as $def) {
                $clients[] = User::create([
                    'name' => $def['name'],
                    'email' => $def['email'],
                    'password' => Hash::make($password),
                    'role' => 'client',
                    'phone' => $def['phone'],
                    'address' => $def['address'],
                    'date_of_birth' => $def['date_of_birth'],
                    'bpjs_number' => $def['bpjs_number'],
                ]);
            }

            $claimDefs = [
                ['client' => 0, 'type' => 'Outpatient', 'disease_name' => 'Demam Berdarah',
                    'provider_name' => 'RS Mitra Sehat Jakarta', 'amount' => 1850000, 'days_ago' => 10,
                    'description' => 'Rawat inap tiga hari karena demam berdarah.'],
                ['client' => 0, 'type' => 'Pharmacy', 'disease_name' => 'Hipertensi',
                    'provider_name' => 'Apotek Sehat Sentosa', 'amount' => 320000, 'days_ago' => 4,
                    'description' => 'Obat rutin hipertensi untuk satu bulan.'],
                ['client' => 1, 'type' => 'Dental', 'disease_name' => 'Infeksi Gigi',
                    'provider_name' => 'Klinik Gigi Cerah Bandung', 'amount' => 2750000, 'days_ago' => 14,
                    'description' => 'Perawatan saluran akar gigi dan mahkota.'],
                ['client' => 1, 'type' => 'Maternity', 'disease_name' => 'Kehamilan',
                    'provider_name' => 'RS Bunda Bandung', 'amount' => 1200000, 'days_ago' => 7,
                    'description' => 'Pemeriksaan kehamilan trimester kedua.'],
                ['client' => 2, 'type' => 'Emergency', 'disease_name' => 'Fraktur',
                    'provider_name' => 'RSUD Dr. Soetomo Surabaya', 'amount' => 8500000, 'days_ago' => 21,
                    'description' => 'Penanganan fraktur lengan bawah di IGD.'],
                ['client' => 2, 'type' => 'Specialist Visit', 'disease_name' => 'Diabetes Melitus',
                    'provider_name' => 'RS Siloam Surabaya', 'amount' => 950000, 'days_ago' => 2,
                    'description' => 'Konsultasi spesialis penyakit dalam dan pemeriksaan gula darah.'],
            ];

            $created = [];
            foreach ($claimDefs as $index => $def) {
                $client = $clients[$def['client']];
                $created[$index] = $claims->create($client, [
                    'client_name' => $client->name,
                    'type' => $def['type'],
                    'disease_name' => $def['disease_name'],
                    'description' => $def['description'],
                    'provider_name' => $def['provider_name'],
                    'amount' => $def['amount'],
                    'bpjs_number' => $client->bpjs_number,
                    'patient_date_of_birth' => $client->date_of_birth?->format('Y-m-d'),
                    'service_date' => now()->subDays($def['days_ago'])->format('Y-m-d'),
                ]);
            }

            // Each analyst owns two claims.
            $assignments = [0 => [0, 1], 1 => [2, 3], 2 => [4, 5]];
            foreach ($assignments as $analystIndex => $claimIndexes) {
                foreach ($claimIndexes as $claimIndex) {
                    $created[$claimIndex] = $claims->assign($analysts[$analystIndex], $created[$claimIndex]);
                }
            }

            $claims->decide($analysts[0], $created[0], [
                'status' => 'Approved',
                'notes' => 'Semua dokumen lengkap. Klaim disetujui penuh.',
            ]);

            // A document-request task for the analyst and a Needs Info status for the client.
            $created[1]->documentRequests()->create([
                'title' => 'Resep dan kwitansi apotek',
                'instructions' => 'Mohon unggah resep dokter dan kwitansi asli dari apotek.',
                'requested_by' => $analysts[0]->id,
            ]);
            $claims->decide($analysts[0], $created[1], [
                'status' => 'Needs Info',
                'notes' => 'Mohon unggah resep dokter dan kwitansi asli dari apotek.',
            ]);

            $claims->decide($analysts[1], $created[2], [
                'status' => 'Partially Approved',
                'approved_amount' => 2000000,
                'notes' => 'Sebagian biaya tidak tercakup polis.',
            ]);
            $claims->decide($analysts[1], $created[3], [
                'status' => 'Rejected',
                'notes' => 'Layanan tidak tercakup dalam polis.',
            ]);

            $created[4]->documentRequests()->create([
                'title' => 'Laporan medis dan hasil rontgen',
                'instructions' => 'Mohon unggah laporan medis dan hasil rontgen terbaru.',
                'requested_by' => $analysts[2]->id,
            ]);
            $claims->decide($analysts[2], $created[4], [
                'status' => 'Needs Info',
                'notes' => 'Mohon unggah laporan medis dan hasil rontgen terbaru.',
            ]);
            $claims->decide($analysts[2], $created[5], [
                'status' => 'Approved',
                'notes' => 'Klaim disetujui penuh.',
            ]);

            ClaimMessage::create([
                'claim_id' => $created[0]->id,
                'user_id' => $clients[0]->id,
                'body' => 'Dokumen tambahan sudah saya unggah. Mohon diperiksa.',
            ]);
            ClaimMessage::create([
                'claim_id' => $created[0]->id,
                'user_id' => $analysts[0]->id,
                'body' => 'Terima kasih, klaim Anda sudah kami setujui.',
            ]);
            ClaimMessage::create([
                'claim_id' => $created[1]->id,
                'user_id' => $analysts[0]->id,
                'body' => 'Mohon unggah resep dan kwitansi apotek melalui halaman klaim.',
            ]);

            // The primary accounts printed by `terraform apply` get their own
            // claim and review task, so those logins are not empty either.
            $primaryClientEmail = getenv('DEMO_PRIMARY_CLIENT_EMAIL') ?: null;
            $primaryAnalystEmail = getenv('DEMO_PRIMARY_ANALYST_EMAIL') ?: null;
            $primaryClient = $primaryClientEmail ? User::where('email', $primaryClientEmail)->first() : null;
            $primaryAnalyst = $primaryAnalystEmail ? User::where('email', $primaryAnalystEmail)->first() : null;

            if ($primaryClient && $primaryAnalyst) {
                $primaryClaim = $claims->create($primaryClient, [
                    'client_name' => $primaryClient->name,
                    'type' => 'Outpatient',
                    'disease_name' => 'Gastritis',
                    'description' => 'Pemeriksaan dan pengobatan sakit maag di klinik.',
                    'provider_name' => 'Klinik Sehat Nusantara',
                    'amount' => 640000,
                    'bpjs_number' => $primaryClient->bpjs_number,
                    'patient_date_of_birth' => $primaryClient->date_of_birth?->format('Y-m-d'),
                    'service_date' => now()->subDays(3)->format('Y-m-d'),
                ]);
                $primaryClaim = $claims->assign($primaryAnalyst, $primaryClaim);
                $primaryClaim->documentRequests()->create([
                    'title' => 'Kwitansi dan hasil pemeriksaan',
                    'instructions' => 'Mohon unggah kwitansi asli dan hasil pemeriksaan dokter.',
                    'requested_by' => $primaryAnalyst->id,
                ]);
                $claims->decide($primaryAnalyst, $primaryClaim, [
                    'status' => 'Needs Info',
                    'notes' => 'Mohon unggah kwitansi asli dan hasil pemeriksaan dokter.',
                ]);
            }

            echo "Seeded 3 clients, 3 analysts, 7 claims, 7 assignments, 3 document requests and 3 messages.\n";
        }
    }
  PHP
}

# -------------------------
# Resource group
# -------------------------

resource "azurerm_resource_group" "main" {
  name     = "rg-healthguard"
  location = var.location
}

# -------------------------
# Networking
# -------------------------

resource "azurerm_virtual_network" "main" {
  name                = "vnet-healthguard"
  address_space       = ["10.10.0.0/16"]
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
}

resource "azurerm_subnet" "main" {
  name                 = "subnet-healthguard"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.10.1.0/24"]
}

resource "azurerm_network_security_group" "main" {
  name                = "nsg-healthguard"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  security_rule {
    name                       = "AllowHTTP"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "80"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  dynamic "security_rule" {
    for_each = var.ssh_allowed_cidr == "" ? [] : [var.ssh_allowed_cidr]

    content {
      name                       = "AllowRestrictedSSH"
      priority                   = 110
      direction                  = "Inbound"
      access                     = "Allow"
      protocol                   = "Tcp"
      source_port_range          = "*"
      destination_port_range     = "22"
      source_address_prefix      = security_rule.value
      destination_address_prefix = "*"
    }
  }
}

resource "azurerm_public_ip" "main" {
  name                = "pip-healthguard"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  allocation_method = "Static"
  sku               = "Standard"
}

resource "azurerm_network_interface" "main" {
  name                = "nic-healthguard"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  ip_configuration {
    name                          = "internal"
    subnet_id                     = azurerm_subnet.main.id
    private_ip_address_allocation = "Dynamic"
    public_ip_address_id          = azurerm_public_ip.main.id
  }
}

resource "azurerm_network_interface_security_group_association" "main" {
  network_interface_id      = azurerm_network_interface.main.id
  network_security_group_id = azurerm_network_security_group.main.id
}

# -------------------------
# Linux VM
# -------------------------

resource "azurerm_linux_virtual_machine" "main" {
  name                = "vm-healthguard"
  computer_name       = "healthguard"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location

  size = var.vm_size

  admin_username = var.admin_username
  admin_password = random_password.vm_password.result

  disable_password_authentication = false

  # Azure reports this as enabled for the Ubuntu image, while the provider
  # defaults to false; pin it so plan does not show perpetual drift.
  vm_agent_platform_updates_enabled = true

  network_interface_ids = [
    azurerm_network_interface.main.id
  ]

  os_disk {
    name                 = "disk-healthguard"
    caching              = "ReadWrite"
    storage_account_type = "Standard_LRS"
    disk_size_gb         = var.disk_size_gb
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "ubuntu-24_04-lts"
    sku       = "server"
    version   = "latest"
  }

  boot_diagnostics {}

  # Host nginx serves the deployment status page immediately at boot, then
  # proxies the application once containers are running. Docker, source and
  # credentials are all provisioned here so apply is reproducible.
  custom_data = base64encode(<<-CLOUDINIT
    #!/bin/bash
    set -Eeuo pipefail

    exec > >(tee -a /var/log/healthguard-install.log) 2>&1

    export DEBIAN_FRONTEND=noninteractive

    STARTED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    STATUS_DIR=/var/www/healthguard-status
    STATUS_FILE=$STATUS_DIR/status.json

    mkdir -p "$STATUS_DIR"

    # Writes the machine-readable status consumed by the status page and
    # appends a human-readable line to the live log.
    status() {
      stage="$1"
      pct="$2"
      msg="$3"
      ready="false"
      if [ "$#" -ge 4 ]; then
        ready="$4"
      fi
      now="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
      printf '{"stage":"%s","progress":%s,"message":"%s","started_at":"%s","updated_at":"%s","ready":%s}\n' \
        "$stage" "$pct" "$msg" "$STARTED_AT" "$now" "$ready" > "$STATUS_FILE.tmp"
      mv "$STATUS_FILE.tmp" "$STATUS_FILE"
      printf '%s  %3s%%  %s\n' "$now" "$pct" "$msg" >> "$STATUS_DIR/events.log"
      echo "[status] $pct% $msg"
    }

    trap 'status failed 100 "Provisioning failed. Check /deploy-status.log and the install log, then re-apply."' ERR

    echo "Starting HealthGuard provisioning..."

    status bootstrap 2 "Preparing the status page"

    mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled

    printf '%s' '${base64encode(local.deploy_status_page)}' | base64 -d > "$STATUS_DIR/index.html"
    printf '%s' '${base64encode(local.deploy_status_nginx)}' | base64 -d > /etc/nginx/sites-available/healthguard

    # The demo seeder is injected into the backend container later, after the
    # database is migrated and the three primary accounts exist.
    printf '%s' '${base64encode(local.demo_seeder_php)}' | base64 -d > /opt/healthguard-deploy-seeder.php
    chmod 600 /opt/healthguard-deploy-seeder.php

    chmod 755 "$STATUS_DIR"
    chmod 644 "$STATUS_DIR/index.html"

    # -------------------------
    # Swap memory
    # -------------------------

    fallocate -l 4G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile

    grep -q '^/swapfile ' /etc/fstab || \
      echo '/swapfile none swap sw 0 0' >> /etc/fstab

    sysctl vm.swappiness=30

    # -------------------------
    # Host nginx (status page + reverse proxy)
    # -------------------------

    status dependencies 5 "Installing nginx and system packages"

    apt-get update

    apt-get install -y \
      nginx \
      ca-certificates \
      curl \
      git \
      gnupg

    rm -f /etc/nginx/sites-enabled/default
    ln -sf /etc/nginx/sites-available/healthguard /etc/nginx/sites-enabled/healthguard

    nginx -t
    systemctl enable --now nginx
    systemctl reload nginx

    status dependencies 10 "Status page is live at /deploy-status. Installing Docker"

    # -------------------------
    # Install Docker
    # -------------------------

    install -m 0755 -d /etc/apt/keyrings

    curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
      | gpg --dearmor -o /etc/apt/keyrings/docker.gpg

    chmod a+r /etc/apt/keyrings/docker.gpg

    ARCH="$(dpkg --print-architecture)"

    . /etc/os-release

    echo "deb [arch=$${ARCH} signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $${VERSION_CODENAME} stable" \
      > /etc/apt/sources.list.d/docker.list

    apt-get update

    apt-get install -y \
      docker-ce \
      docker-ce-cli \
      containerd.io \
      docker-buildx-plugin \
      docker-compose-plugin

    systemctl enable --now docker

    status docker 25 "Docker is installed. Fetching the source code"

    # -------------------------
    # Clone repository
    # -------------------------

    git clone --depth 1 \
      https://github.com/TMRakaP26/Health-Guard-Claim-Asurance.git \
      /opt/healthguard

    cd /opt/healthguard

    # -------------------------
    # Configure environment
    # -------------------------

    # compose.yaml keeps the frontend on loopback 8080; host nginx owns port
    # 80 so the status page is reachable even when the stack is down.
    PUBLIC_IP="${azurerm_public_ip.main.ip_address}"

    cp .env.example .env

    # Compose rejects .env lines that are not KEY=VALUE or a comment, so drop
    # any stray marker line before the file is handed to docker compose.
    sed -i -E '/^[[:space:]]*(#|$)/!{/^[A-Za-z_][A-Za-z0-9_]*=/!d}' .env

    # TRUSTED_HOSTS must also list loopback: the Compose healthcheck probes
    # http://localhost/health/ready and Laravel answers 400 for unknown hosts.
    sed -i \
      -e 's|^APP_ENV=.*|APP_ENV=production|' \
      -e 's|^HEALTHGUARD_PORT=.*|HEALTHGUARD_PORT=8080|' \
      -e "s|^PUBLIC_URL=.*|PUBLIC_URL=http://$PUBLIC_IP|" \
      -e "s|^TRUSTED_HOSTS=.*|TRUSTED_HOSTS=$PUBLIC_IP,localhost,127.0.0.1|" \
      -e 's|^DB_DATABASE=.*|DB_DATABASE=healthguard|' \
      -e 's|^DB_USERNAME=.*|DB_USERNAME=healthguard|' \
      -e 's|^DEMO_SEED_ENABLED=.*|DEMO_SEED_ENABLED=false|' \
      .env

    sed -i \
      '/^DB_PASSWORD=/d; /^DB_ROOT_PASSWORD=/d' \
      .env

    printf '%s\n' \
      'DB_PASSWORD=${random_password.db_password.result}' \
      'DB_ROOT_PASSWORD=${random_password.db_root_password.result}' \
      >> .env

    chmod 600 .env

    status configure 35 "Environment configured. Building images (the slow step)"

    # -------------------------
    # Build and start containers
    # -------------------------

    cd /opt/healthguard

    export COMPOSE_PARALLEL_LIMIT=1

    # Build sequentially to avoid exhausting RAM.
    status build-backend 50 "Building the backend image (several minutes)"
    docker compose build backend

    status build-frontend 70 "Building the frontend image"
    docker compose build frontend

    # Start MySQL, Laravel and React/Nginx.
    status start 80 "Starting containers: database, backend, frontend"
    docker compose up -d --wait --wait-timeout 2400

    # -------------------------
    # Create the administrator
    # -------------------------

    # The application ships no seeded staff accounts: public signup creates
    # clients only and staff accounts must come from a trusted terminal. That
    # terminal step is automated here so every rebuild of this VM ends up with
    # a working admin login instead of an empty database.
    #
    # The command is interactive, so the answers are piped in and `-T` keeps
    # docker compose from allocating a TTY. If the account already exists the
    # command reports a validation error; that is expected and not fatal.
    status admin 88 "Creating the administrator account"
    if printf '%s\n' \
      '${var.app_admin_name}' \
      '${var.app_admin_email}' \
      '${random_password.app_admin_password.result}' \
      '${random_password.app_admin_password.result}' \
      | docker compose exec -T backend php artisan healthguard:create-admin 2>&1 \
      | tee -a /var/log/healthguard-admin.log \
      | grep -F 'account created'; then
      echo "Administrator ${var.app_admin_email} is ready."
    else
      echo "Administrator not created; see /var/log/healthguard-admin.log"
    fi

    # -------------------------
    # Create the analyst
    # -------------------------

    status analyst 91 "Creating the analyst account"
    if printf '%s\n' \
      '${var.analyst_name}' \
      '${var.analyst_email}' \
      '${random_password.analyst_password.result}' \
      '${random_password.analyst_password.result}' \
      | docker compose exec -T backend php artisan healthguard:create-analyst 2>&1 \
      | tee -a /var/log/healthguard-analyst.log \
      | grep -F 'Analyst account created'; then
      echo "Analyst ${var.analyst_email} is ready."
    else
      echo "Analyst not created; see /var/log/healthguard-analyst.log"
    fi

    # -------------------------
    # Create the demo claim user (client)
    # -------------------------

    # Public registration always creates a client, which is exactly the role
    # that can create and manage claims. On a fresh rebuild the database is
    # empty, so this succeeds; it is run after the admin step against the
    # already-running stack. A validation error (e.g. duplicate email) is not
    # fatal and provisioning continues.
    status client 95 "Creating the claim (client) account"
    if curl -fsS -X POST http://127.0.0.1/api/register \
      -H 'Content-Type: application/json' \
      -H 'Accept: application/json' \
      -d '{"name":"${var.claim_user_name}","email":"${var.claim_user_email}","password":"${random_password.claim_user_password.result}","password_confirmation":"${random_password.claim_user_password.result}"}' \
      | tee -a /var/log/healthguard-claimuser.log \
      | grep -F '"role":"client"'; then
      echo "Client ${var.claim_user_email} is ready."
    else
      echo "Client not created; see /var/log/healthguard-claimuser.log"
    fi

    # -------------------------
    # Demo clients, analysts, claims and tasks
    # -------------------------

    # The seeder file was written at boot. It is copied into the running
    # backend, executed once, and then removed. The guard inside the seeder
    # makes a second run a no-op.
    status demo-data 97 "Creating demo clients, analysts, claims and tasks"

    docker compose cp /opt/healthguard-deploy-seeder.php \
      backend:/var/www/html/database/seeders/DeploymentDemoSeeder.php

    # Refresh the classmap so the injected seeder is discoverable. The image
    # keeps PSR-4 rules, but this also covers a classmap-authoritative build.
    docker compose exec -T backend \
      composer dump-autoload --no-dev --optimize --no-interaction \
      >> /var/log/healthguard-demo-seed.log 2>&1 || true

    if docker compose exec -T \
      -e DEMO_SEED_PASSWORD='${random_password.demo_password.result}' \
      -e DEMO_PRIMARY_CLIENT_EMAIL='${var.claim_user_email}' \
      -e DEMO_PRIMARY_ANALYST_EMAIL='${var.analyst_email}' \
      backend php artisan db:seed --class='Database\Seeders\DeploymentDemoSeeder' --force 2>&1 \
      | tee -a /var/log/healthguard-demo-seed.log; then
      echo "Demo data is ready."
    else
      echo "Demo data seeding failed; see /var/log/healthguard-demo-seed.log"
    fi

    docker compose exec -T backend \
      rm -f database/seeders/DeploymentDemoSeeder.php || true
    rm -f /opt/healthguard-deploy-seeder.php

    # -------------------------
    # Finish
    # -------------------------

    apt-get clean
    rm -rf /var/lib/apt/lists/*

    echo "HealthGuard deployment completed at $(date -Is)" \
      > /var/log/healthguard-deployment-complete

    status ready 100 "HealthGuard is live at http://$PUBLIC_IP" true

    echo "HealthGuard is deployed."
  CLOUDINIT
  )

  tags = {
    project     = "healthguard"
    environment = "demo"
  }

  depends_on = [
    azurerm_network_interface_security_group_association.main
  ]
}

# -------------------------
# Outputs
# -------------------------

output "application_url" {
  description = "HealthGuard application URL"
  value       = "http://${azurerm_public_ip.main.ip_address}"
}

output "deploy_status_url" {
  description = "Live deployment progress page (available from boot, before the app is ready)"
  value       = "http://${azurerm_public_ip.main.ip_address}/deploy-status"
}

output "public_ip" {
  value = azurerm_public_ip.main.ip_address
}

output "vm_name" {
  value = azurerm_linux_virtual_machine.main.name
}

output "admin_username" {
  value = var.admin_username
}

output "admin_password" {
  value     = random_password.vm_password.result
  sensitive = true
}

output "database_password" {
  value     = random_password.db_password.result
  sensitive = true
}

output "database_root_password" {
  value     = random_password.db_root_password.result
  sensitive = true
}

output "app_admin_email" {
  description = "Administrator login created automatically during provisioning"
  value       = var.app_admin_email
}

output "app_admin_password" {
  description = "Password of the automatically created administrator"
  value       = random_password.app_admin_password.result
  sensitive   = true
}

output "claim_user_email" {
  description = "Demo client (claim) login created automatically during provisioning"
  value       = var.claim_user_email
}

output "claim_user_password" {
  description = "Password of the demo client (claim) account"
  value       = random_password.claim_user_password.result
  sensitive   = true
}

output "analyst_email" {
  description = "Analyst login created automatically during provisioning"
  value       = var.analyst_email
}

output "analyst_password" {
  description = "Password of the automatically created analyst"
  value       = random_password.analyst_password.result
  sensitive   = true
}

# Printed by `terraform apply` on every run. Keep these demo credentials out of
# real production; rotate or remove the accounts before handling live data.
output "login_credentials" {
  description = "Application logins for all three roles (admin, analyst, client)"
  value = join("\n", [
    "Administrator : ${var.app_admin_email} / ${nonsensitive(random_password.app_admin_password.result)}",
    "Analyst       : ${var.analyst_email} / ${nonsensitive(random_password.analyst_password.result)}",
    "Client        : ${var.claim_user_email} / ${nonsensitive(random_password.claim_user_password.result)}",
  ])
}

output "demo_password" {
  description = "Shared password of the additional demo clients and analysts"
  value       = random_password.demo_password.result
  sensitive   = true
}

# Additional demo accounts written by the deployment seeder. Each client owns
# claims and each analyst owns review tasks. Printed by apply because this is a
# demo environment; see login_credentials for the three primary accounts.
output "demo_accounts" {
  description = "Additional demo clients and analysts created on every deployment"
  value = join("\n", [
    "Demo clients  : client1@example.test, client2@example.test, client3@example.test",
    "Demo analysts : analyst1@example.test, analyst2@example.test, analyst3@example.test",
    "Shared password: ${nonsensitive(random_password.demo_password.result)}",
  ])
}

output "ssh_command" {
  value = var.ssh_allowed_cidr == "" ? "SSH disabled. Set ssh_allowed_cidr to enable access." : "ssh ${var.admin_username}@${azurerm_public_ip.main.ip_address}"
}

output "deployment_log_command" {
  value = "az vm run-command invoke --resource-group ${azurerm_resource_group.main.name} --name ${azurerm_linux_virtual_machine.main.name} --command-id RunShellScript --scripts 'tail -n 150 /var/log/healthguard-install.log; tail -n 40 /var/log/healthguard-admin.log'"
}

output "admin_credentials_command" {
  value = "terraform output -raw app_admin_password"
}
