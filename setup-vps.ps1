#!/usr/bin/env pwsh
# ============================================================
# setup-vps.ps1  --  Run ONCE to prepare the Hostinger VPS
# ============================================================
# Usage: .\setup-vps.ps1
# You will be prompted for your VPS root password once.
# ============================================================

$VPS_HOST = "187.77.191.58"
$VPS_USER = "root"
$VPS_DIR  = "/opt/wa-gateway"
$target   = "$VPS_USER@$VPS_HOST"
$PUB_KEY  = (Get-Content "$env:USERPROFILE\.ssh\id_ed25519.pub").Trim()

Write-Host ""
Write-Host "=== WA Gateway - VPS First-Time Setup ===" -ForegroundColor Cyan
Write-Host "Target: $target"
Write-Host ""

Write-Host "[1/4] Copying SSH public key to VPS..." -ForegroundColor Yellow
Write-Host "      You will be prompted for the VPS root password."
Write-Host ""

$keyScript = "mkdir -p ~/.ssh; chmod 700 ~/.ssh; echo '$PUB_KEY' >> ~/.ssh/authorized_keys; chmod 600 ~/.ssh/authorized_keys; echo SSH_KEY_OK"
$result = ssh -o "StrictHostKeyChecking=accept-new" -o "ConnectTimeout=15" $target $keyScript 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Could not connect. Check password and try again." -ForegroundColor Red
    exit 1
}
Write-Host "[OK] SSH key installed." -ForegroundColor Green
Write-Host ""

Write-Host "[2/4] Installing Docker on VPS..." -ForegroundColor Yellow
ssh $target 'if ! command -v docker &> /dev/null; then curl -fsSL https://get.docker.com | sh; systemctl enable docker; systemctl start docker; fi; docker --version'

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Docker installation failed." -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Docker ready." -ForegroundColor Green
Write-Host ""

Write-Host "[3/4] Creating project directory..." -ForegroundColor Yellow
ssh $target "mkdir -p $VPS_DIR"
Write-Host "[OK] $VPS_DIR created." -ForegroundColor Green
Write-Host ""

Write-Host "[4/4] Uploading .env file..." -ForegroundColor Yellow
if (Test-Path ".env") {
    scp .env "${target}:${VPS_DIR}/.env"
    Write-Host "[OK] .env uploaded." -ForegroundColor Green
} else {
    Write-Host "WARNING: No .env file found locally." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Setup Complete! Now run: .\deploy.ps1 ===" -ForegroundColor Green
Write-Host ""
