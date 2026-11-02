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

  # Automatically install Docker, clone and launch the application.
  custom_data = base64encode(<<-CLOUDINIT
    #!/bin/bash
    set -Eeuo pipefail

    exec > >(tee -a /var/log/healthguard-install.log) 2>&1

    export DEBIAN_FRONTEND=noninteractive

    echo "Starting HealthGuard provisioning..."

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
    # Install dependencies
    # -------------------------

    apt-get update

    apt-get install -y \
      ca-certificates \
      curl \
      git \
      gnupg

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

    # -------------------------
    # Clone repository
    # -------------------------

    git clone --depth 1 \
      https://github.com/TMRakaP26/Health-Guard-Claim-Asurance.git \
      /opt/healthguard

    cd /opt/healthguard

    # -------------------------
    # Configure public access
    # -------------------------

    # Original frontend binding is localhost:8080.
    # Change it to public port 80.
    sed -i \
      's|127.0.0.1:$${HEALTHGUARD_PORT:-8080}:80|0.0.0.0:80:80|' \
      compose.yaml

    # -------------------------
    # Configure environment
    # -------------------------

    PUBLIC_IP="${azurerm_public_ip.main.ip_address}"

    cp .env.example .env

    # Compose rejects .env lines that are not KEY=VALUE or a comment, so drop
    # any stray marker line before the file is handed to docker compose.
    sed -i -E '/^[[:space:]]*(#|$)/!{/^[A-Za-z_][A-Za-z0-9_]*=/!d}' .env

    # TRUSTED_HOSTS must also list loopback: the Compose healthcheck probes
    # http://localhost/health/ready and Laravel answers 400 for unknown hosts.
    sed -i \
      -e 's|^APP_ENV=.*|APP_ENV=production|' \
      -e 's|^HEALTHGUARD_PORT=.*|HEALTHGUARD_PORT=80|' \
      -e "s|^PUBLIC_URL=.*|PUBLIC_URL=http://$${PUBLIC_IP}|" \
      -e "s|^TRUSTED_HOSTS=.*|TRUSTED_HOSTS=$${PUBLIC_IP},localhost,127.0.0.1|" \
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

    # -------------------------
    # Build and start containers
    # -------------------------

    cd /opt/healthguard

    export COMPOSE_PARALLEL_LIMIT=1

    # Build sequentially to avoid exhausting RAM.
    docker compose build backend

    docker compose build frontend

    # Start MySQL, Laravel and React/Nginx.
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
    # Finish
    # -------------------------

    echo "HealthGuard deployment completed at $(date -Is)" \
      > /var/log/healthguard-deployment-complete

    apt-get clean
    rm -rf /var/lib/apt/lists/*

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

output "ssh_command" {
  value = var.ssh_allowed_cidr == "" ? "SSH disabled. Set ssh_allowed_cidr to enable access." : "ssh ${var.admin_username}@${azurerm_public_ip.main.ip_address}"
}

output "deployment_log_command" {
  value = "az vm run-command invoke --resource-group ${azurerm_resource_group.main.name} --name ${azurerm_linux_virtual_machine.main.name} --command-id RunShellScript --scripts 'tail -n 150 /var/log/healthguard-install.log; tail -n 40 /var/log/healthguard-admin.log'"
}

output "admin_credentials_command" {
  value = "terraform output -raw app_admin_password"
}
