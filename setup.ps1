# setup.ps1 - Levanta A.R.C.A. en local (Windows / PowerShell)
# Requiere: Git, Node.js 18+, Docker Desktop ya instalados y corriendo.
# Instala SOLO lo estrictamente necesario: deps declaradas en package.json,
# infra MySQL via Docker, .env.local y migraciones. No instala nada global
# ni dependencias "planificadas" que el codigo todavia no usa.

$ErrorActionPreference = "Stop"
$RepoRoot = $PSScriptRoot

function Assert-Command($name, $hint) {
    if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
        Write-Error "`n[FALTA] '$name' no esta instalado o no esta en PATH.`n$hint`n"
        exit 1
    }
}

Write-Host "== 1. Verificando prerrequisitos ==" -ForegroundColor Cyan
Assert-Command git    "Instalar: https://git-scm.com/download/win"
Assert-Command node   "Instalar (requiere admin): winget install OpenJS.NodeJS.LTS"
Assert-Command npm    "Viene con Node.js - reinstalar Node si falta."
Assert-Command docker "Instalar (requiere admin + reinicio): winget install Docker.DockerDesktop"

$nodeVersion = [int]((node -v) -replace 'v(\d+).*', '$1')
if ($nodeVersion -lt 18) {
    Write-Error "Node.js $nodeVersion detectado. Se requiere 18+."
    exit 1
}

try {
    docker info | Out-Null
} catch {
    Write-Error "Docker Desktop no esta corriendo. Abrilo y espera a que el icono quede en verde."
    exit 1
}
Write-Host "OK: git, node $((node -v)), npm $((npm -v)), docker $((docker --version))" -ForegroundColor Green

Write-Host "`n== 2. Levantando MySQL (Docker) ==" -ForegroundColor Cyan
Push-Location $RepoRoot
docker compose up -d

Write-Host "Esperando a que arca-mysql este healthy..." -ForegroundColor Yellow
$maxWait = 60
$elapsed = 0
do {
    Start-Sleep -Seconds 2
    $elapsed += 2
    $health = docker inspect --format='{{.State.Health.Status}}' arca-mysql 2>$null
    if ($elapsed -ge $maxWait) {
        Write-Error "MySQL no quedo healthy tras $maxWait s. Revisar: docker compose logs mysql"
        exit 1
    }
} while ($health -ne "healthy")
Write-Host "OK: arca-mysql healthy" -ForegroundColor Green

Write-Host "`n== 3. Nucleo compartido + backends (npm workspaces) ==" -ForegroundColor Cyan
Push-Location $RepoRoot

# Un solo "npm install" en la raiz resuelve packages/arca-core, apps/backend
# y apps/backend-admin de una (estan en el arreglo "workspaces" del
# package.json raiz). No correr npm install DENTRO de apps/backend o
# apps/backend-admin: eso rompe el hoisting de dependencias entre workspaces
# (ver docs/SETUP_LOCAL.md).
npm install
npm run build:core

function New-BackendEnvLocal($appPath, $port) {
    Push-Location $appPath
    $envLocal = ".env.local"
    if (-not (Test-Path $envLocal)) {
        Copy-Item ".env.example" $envLocal
        (Get-Content $envLocal) `
            -replace '^DB_USERNAME=.*', 'DB_USERNAME=arca_user' `
            -replace '^DB_PASSWORD=.*', 'DB_PASSWORD=arca_pass' |
            Set-Content $envLocal
        Write-Host "Creado $appPath\.env.local con credenciales locales." -ForegroundColor Green
    } else {
        Write-Host "$appPath\.env.local ya existe, no se modifica." -ForegroundColor Yellow
    }
    Pop-Location
}

New-BackendEnvLocal "$RepoRoot\apps\backend" 3000
New-BackendEnvLocal "$RepoRoot\apps\backend-admin" 3001

Write-Host "Ejecutando migraciones (solo apps/backend; backend-admin no corre migraciones)..." -ForegroundColor Cyan
Push-Location "$RepoRoot\apps\backend"
npm run migration:run
Pop-Location

Pop-Location

Write-Host "`n== 4. Frontends (Vite + React, npm install independiente c/u) ==" -ForegroundColor Cyan

function New-FrontendEnvLocal($appPath, $lines) {
    Push-Location $appPath
    npm install
    $feEnvLocal = ".env.local"
    if (-not (Test-Path $feEnvLocal)) {
        $lines | Set-Content $feEnvLocal
        Write-Host "Creado $appPath\.env.local" -ForegroundColor Green
    } else {
        Write-Host "$appPath\.env.local ya existe, no se modifica." -ForegroundColor Yellow
    }
    Pop-Location
}

New-FrontendEnvLocal "$RepoRoot\apps\frontend" @("VITE_API_URL=/api", "VITE_ADMIN_URL=http://localhost:5174")
New-FrontendEnvLocal "$RepoRoot\apps\admin-web" @("VITE_API_URL=/api")

Write-Host "`n== 5. Levantando servidores ==" -ForegroundColor Cyan

function Stop-PortOwner($port) {
    $procId = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
    if ($procId) {
        Write-Host "Puerto $port ocupado por PID $procId, liberando..." -ForegroundColor Yellow
        Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 1
    }
}

Stop-PortOwner 3000
Stop-PortOwner 3001
Stop-PortOwner 5173
Stop-PortOwner 5174

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$RepoRoot\apps\backend'; npm run start:dev"
Start-Sleep -Seconds 3
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$RepoRoot\apps\backend-admin'; npm run start:dev"
Start-Sleep -Seconds 3
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$RepoRoot\apps\frontend'; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$RepoRoot\apps\admin-web'; npm run dev"

Write-Host "`n== Listo ==" -ForegroundColor Green
Write-Host "Backend        -> http://localhost:3000  (ventana nueva)"
Write-Host "Backend admin  -> http://localhost:3001  (ventana nueva)"
Write-Host "Frontend       -> http://localhost:5173  (ventana nueva)"
Write-Host "Panel admin    -> http://localhost:5174  (ventana nueva)"
Write-Host "Cerra esas ventanas para detener los servidores."
Write-Host "`nEsperando unos segundos antes de verificar los backends..."
Start-Sleep -Seconds 5
foreach ($check in @(
    @{ Name = "Backend"; Url = "http://localhost:3000/api/health" },
    @{ Name = "Backend admin"; Url = "http://localhost:3001/api/health" }
)) {
    try {
        $r = Invoke-WebRequest $check.Url -UseBasicParsing -TimeoutSec 5
        Write-Host "$($check.Name) OK: $($r.Content)" -ForegroundColor Green
    } catch {
        Write-Host "$($check.Name) todavia no responde, puede necesitar unos segundos mas. Revisa su ventana." -ForegroundColor Yellow
    }
}
