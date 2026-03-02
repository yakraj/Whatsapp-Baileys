$VPS_HOST = "187.77.191.58"
$VPS_USER = "root"
$VPS_DIR  = "/opt/wa-gateway"
$target   = $VPS_USER + "@" + $VPS_HOST
$ZIP_NAME = "wa-gateway-deploy.tar.gz"
$TEMP_ZIP = "$env:TEMP\$ZIP_NAME"

Write-Host ""
Write-Host "=== WA Gateway - Deploying to VPS ===" -ForegroundColor Cyan
Write-Host "Target: $target"
Write-Host ""

# 1. Verify SSH access
Write-Host "[1/5] Verifying SSH access..." -ForegroundColor Yellow
$sshTest = ssh -o "BatchMode=yes" -o "ConnectTimeout=10" $target "echo OK" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Cannot connect. Run .\setup-vps.ps1 first." -ForegroundColor Red
    exit 1
}
Write-Host "[OK] SSH access confirmed." -ForegroundColor Green
Write-Host ""

# 2. Pack project
Write-Host "[2/5] Packing project files..." -ForegroundColor Yellow
$excludeList = @("node_modules",".next",".git",".vscode","dev.log","dev.err.log","pid_test.log","changes.patch")
$tarCmd = Get-Command tar -ErrorAction SilentlyContinue
if ($tarCmd) {
    $excludeArgs = ($excludeList | ForEach-Object { "--exclude=./$_" }) -join " "
    $fullArgs = "-czf `"$TEMP_ZIP`" $excludeArgs ."
    $p = Start-Process tar -ArgumentList $fullArgs -WorkingDirectory (Get-Location) -Wait -PassThru -NoNewWindow
    if ($p.ExitCode -ne 0) { $tarCmd = $null }
}
if (-not $tarCmd) {
    $ZIP_NAME = "wa-gateway-deploy.zip"
    $TEMP_ZIP = "$env:TEMP\$ZIP_NAME"
    $items = Get-ChildItem -Force | Where-Object { $_.Name -notin $excludeList }
    Compress-Archive -Path $items.FullName -DestinationPath $TEMP_ZIP -Force
}
Write-Host "[OK] Archive: $TEMP_ZIP" -ForegroundColor Green
Write-Host ""

# 3. Upload to VPS
Write-Host "[3/5] Uploading to VPS..." -ForegroundColor Yellow
scp $TEMP_ZIP ($target + ":" + $VPS_DIR + "/" + $ZIP_NAME)
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Upload failed." -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Upload complete." -ForegroundColor Green
Write-Host ""

# 4. Stream bash script to VPS
Write-Host "[4/5] Building Docker container on VPS..." -ForegroundColor Yellow
$scriptFile = "$env:TEMP\vps-deploy.sh"
$d = $VPS_DIR
$z = $ZIP_NAME
$bashLines = @(
    "#!/bin/bash",
    "set -e",
    "cd $d",
    "echo '--- Stopping existing container ---'",
    "docker compose -f docker-compose.yml -f docker-compose.prod.yml down 2>/dev/null || true",
    "docker rm -f wa-gateway-app 2>/dev/null || true",
    "echo '--- Extracting files ---'",
    "if echo $z | grep -q '.tar.gz'; then",
    "    tar -xzf $z",
    "else",
    "    apt-get install -y unzip -qq 2>/dev/null || true",
    "    unzip -o $z",
    "fi",
    "rm -f $z",
    "echo '--- Building Docker image ---'",
    "docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d",
    "echo '--- Waiting for container ---'",
    "sleep 8",
    "docker ps --filter name=wa-gateway-app",
    "docker logs wa-gateway-app --tail 20",
    "echo '--- Done ---'"
)
$bashContent = $bashLines -join "`n"
[System.IO.File]::WriteAllText($scriptFile, $bashContent, [System.Text.UTF8Encoding]::new($false))
Get-Content $scriptFile -Raw | ssh $target "bash"
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Deployment failed. Check logs above." -ForegroundColor Red
    exit 1
}

# 5. Done
Remove-Item $TEMP_ZIP -Force -ErrorAction SilentlyContinue
Remove-Item $scriptFile -Force -ErrorAction SilentlyContinue
Write-Host ""
Write-Host "=== Deployment Complete! ===" -ForegroundColor Green
Write-Host ""
Write-Host "  App URL: http://$VPS_HOST:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Useful commands:" -ForegroundColor Gray
Write-Host "  Logs:    ssh $target 'docker logs wa-gateway-app -f'" -ForegroundColor Gray
Write-Host "  Stop:    ssh $target 'cd $VPS_DIR && docker compose down'" -ForegroundColor Gray
Write-Host "  Restart: ssh $target 'docker restart wa-gateway-app'" -ForegroundColor Gray
Write-Host ""
