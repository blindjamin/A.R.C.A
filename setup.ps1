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

Write-Host "`n== 3. Backend (NestJS) ==" -ForegroundColor Cyan
Push-Location "$RepoRoot\apps\backend"

npm install

$envLocal = ".env.local"
if (-not (Test-Path $envLocal)) {
    Copy-Item ".env.example" $envLocal
    (Get-Content $envLocal) `
        -replace '^DB_USERNAME=.*', 'DB_USERNAME=arca_user' `
        -replace '^DB_PASSWORD=.*', 'DB_PASSWORD=arca_pass' |
        Set-Content $envLocal
    Write-Host "Creado apps/backend/.env.local con credenciales locales." -ForegroundColor Green
} else {
    Write-Host "apps/backend/.env.local ya existe, no se modifica." -ForegroundColor Yellow
}

Write-Host "Ejecutando migraciones..." -ForegroundColor Cyan
npm run migration:run

Pop-Location

Write-Host "`n== 4. Frontend (Vite + React) ==" -ForegroundColor Cyan
Push-Location "$RepoRoot\apps\frontend"

npm install

$feEnvLocal = ".env.local"
if (-not (Test-Path $feEnvLocal)) {
    "VITE_API_URL=/api" | Set-Content $feEnvLocal
    Write-Host "Creado apps/frontend/.env.local" -ForegroundColor Green
} else {
    Write-Host "apps/frontend/.env.local ya existe, no se modifica." -ForegroundColor Yellow
}

Pop-Location
Pop-Location

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
Stop-PortOwner 5173

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$RepoRoot\apps\backend'; npm run start:dev"
Start-Sleep -Seconds 3
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$RepoRoot\apps\frontend'; npm run dev"

Write-Host "`n== Listo ==" -ForegroundColor Green
Write-Host "Backend  -> http://localhost:3000  (ventana nueva)"
Write-Host "Frontend -> http://localhost:5173  (ventana nueva)"
Write-Host "Cerra esas ventanas para detener los servidores."
Write-Host "`nEsperando unos segundos antes de verificar el backend..."
Start-Sleep -Seconds 5
try {
    $r = Invoke-WebRequest http://localhost:3000/health -UseBasicParsing -TimeoutSec 5
    Write-Host "Backend OK: $($r.Content)" -ForegroundColor Green
} catch {
    Write-Host "Backend todavia no responde, puede necesitar unos segundos mas. Revisa la ventana del backend." -ForegroundColor Yellow
}
