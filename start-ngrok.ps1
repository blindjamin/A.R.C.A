# start-ngrok.ps1 - Expone el frontend (5173) via ngrok con dominio fijo.
# El propio Vite hace de proxy interno de /api hacia el backend (localhost:3000),
# asi que un unico tunel alcanza para todo: no hace falta sincronizar .env.local
# en cada corrida ni exponer el backend por separado.
#
# Requiere:
#   1. ngrok instalado: winget install ngrok.ngrok
#   2. Authtoken configurado UNA VEZ por vos mismo:
#         ngrok config add-authtoken TU_TOKEN
#   3. Un dominio estatico reservado en tu cuenta (gratis, 1 por cuenta):
#         https://dashboard.ngrok.com/domains
#      y puesto en ngrok.yml (campo "domain").
#   4. Backend y frontend con dependencias instaladas (correr setup.ps1 antes).

$ErrorActionPreference = "Stop"
$RepoRoot = $PSScriptRoot

function Stop-PortOwner($port) {
    $procId = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
    if ($procId) {
        Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 1
    }
}

$ngrokCmd = Get-Command ngrok -ErrorAction SilentlyContinue
if ($ngrokCmd) {
    $ngrokExe = $ngrokCmd.Source
} elseif (Test-Path "$env:LOCALAPPDATA\Microsoft\WinGet\Links\ngrok.exe") {
    # PATH de la sesion actual desactualizado (comun justo despues de instalar con winget)
    $ngrokExe = "$env:LOCALAPPDATA\Microsoft\WinGet\Links\ngrok.exe"
} else {
    Write-Error "ngrok no esta instalado. Instalar: winget install ngrok.ngrok"
    exit 1
}

$defaultConfig = "$env:LOCALAPPDATA\ngrok\ngrok.yml"
if (-not (Test-Path $defaultConfig)) {
    Write-Error "No se encontro el authtoken de ngrok. Corre primero: ngrok config add-authtoken TU_TOKEN"
    exit 1
}

Write-Host "== 1. Cerrando tuneles ngrok previos (si hay) ==" -ForegroundColor Cyan
Get-Process ngrok -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

Write-Host "== 2. Verificando que backend y frontend esten arriba ==" -ForegroundColor Cyan
if (-not (Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue)) {
    Write-Warning "El backend no esta corriendo en :3000. Corre setup.ps1 primero (o npm run start:dev en apps/backend)."
}
if (-not (Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue)) {
    Write-Warning "El frontend no esta corriendo en :5173. Corre setup.ps1 primero (o npm run dev en apps/frontend)."
}

Write-Host "== 3. Iniciando tunel ngrok (frontend:5173, con proxy interno a /api) ==" -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$RepoRoot'; & '$ngrokExe' start --all --config '$defaultConfig' --config 'ngrok.yml'"

Write-Host "Esperando URL publica de ngrok..." -ForegroundColor Yellow
$publicUrl = $null
$maxWait = 30
$elapsed = 0
while (-not $publicUrl -and $elapsed -lt $maxWait) {
    Start-Sleep -Seconds 2
    $elapsed += 2
    try {
        $tunnels = (Invoke-RestMethod http://127.0.0.1:4040/api/tunnels -TimeoutSec 3).tunnels
        $publicUrl = ($tunnels | Where-Object { $_.name -eq "app" -and $_.proto -eq "https" }).public_url
    } catch {
        # API de ngrok todavia no responde, seguir esperando
    }
}

if (-not $publicUrl) {
    Write-Error "No se obtuvo la URL de ngrok en $maxWait s. Revisa la ventana de ngrok."
    exit 1
}

Write-Host "`n== Listo ==" -ForegroundColor Green
Write-Host "Abri desde el celular (con datos moviles o wifi distinto): $publicUrl"
Write-Host "Panel de inspeccion de ngrok: http://127.0.0.1:4040"
Write-Host "`nComo el dominio es fijo, esta URL no cambia entre corridas."
Write-Host "El backend nunca se expone directo; todo pasa por el proxy /api de Vite."
