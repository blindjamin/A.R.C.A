# Instala las reglas de trabajo del equipo COM Tech en este clon del repositorio.
#
# Este archivo es autocontenido: escribe el hook y la plantilla de commit por su
# cuenta. Basta con dejarlo en CUALQUIER carpeta dentro del repositorio A.R.C.A
# —da lo mismo como se llame la carpeta en tu computador— y correrlo una vez:
#
#     powershell -ExecutionPolicy Bypass -File .\instalar-reglas.ps1
#
# Tambien funciona con clic derecho sobre el archivo > "Ejecutar con PowerShell".
#
# Detalle de la regla en AGENTS.md, seccion A.13.

$ErrorActionPreference = "Stop"

# El script se ubica solo: parte desde la carpeta donde esta guardado y le
# pregunta a git cual es la raiz del repositorio. Asi no importa como se llame
# la carpeta del clon ni desde donde se ejecute.
Set-Location $PSScriptRoot

$raiz = (git rev-parse --show-toplevel 2>$null)

if (-not $raiz) {
    Write-Host ""
    Write-Host "Este archivo no esta dentro de un repositorio git." -ForegroundColor Red
    Write-Host ""
    Write-Host "Muevelo a cualquier carpeta dentro de tu clon de A.R.C.A" -ForegroundColor Yellow
    Write-Host "(la carpeta que contiene README.md, apps/ y docker-compose.yml,"
    Write-Host "se llame como se llame en tu computador) y vuelve a correrlo."
    Write-Host ""
    Write-Host "Carpeta actual: $PSScriptRoot"
    Write-Host ""
    exit 1
}

Set-Location $raiz
Write-Host "Repositorio detectado: $raiz" -ForegroundColor Cyan

# Aviso, no bloqueo: puede haber clones con otro remoto o sin remoto configurado.
$remoto = (git config --get remote.origin.url 2>$null)
if ($remoto -and $remoto -notmatch "A\.?R\.?C\.?A") {
    Write-Host "Aviso: el remoto de este repositorio es $remoto" -ForegroundColor Yellow
    Write-Host "Si no es A.R.C.A, cancela con Ctrl+C." -ForegroundColor Yellow
}

# ---------------------------------------------------------------------------
# 1. Plantilla de commit
# ---------------------------------------------------------------------------

$plantilla = @'
# <tipo>(<scope>): <descripcion corta en imperativo, max 72 caracteres>
#
# Tipos: feat fix docs style refactor test chore
#
# Cuerpo: por que se hizo el cambio, no que hace el codigo (eso ya se lee).
#

IA:
HU:
Revisor:

# ---------------------------------------------------------------------------
# Las tres lineas de arriba son obligatorias. Se borran los comentarios solos.
#
# IA:       como se produjo este cambio
#             agente    lo genero un agente de IA y yo lo revise
#             asistido  lo escribi yo con autocompletado o sugerencias
#             no        lo escribi yo sin ayuda de IA
#
# HU:       historia de usuario que avanza este commit: HU-07
#             usar "ninguna" si el cambio no corresponde a ninguna HU
#             (setup, hotfix, documentacion suelta)
#
# Revisor:  quien va a revisar o ya reviso este cambio: maxi, javier, ana,
#             miguel, benja. Usar "pendiente" si todavia no esta asignado.
#
# Ejemplo completo:
#
#   feat(backend): endpoint de asignacion de operadores
#
#   El panel municipal necesitaba asignar sin pasar por la BD a mano.
#
#   IA: agente
#   HU: HU-07
#   Revisor: javier
# ---------------------------------------------------------------------------
'@

# ---------------------------------------------------------------------------
# 2. Hook que valida los trailers
# ---------------------------------------------------------------------------

$hook = @'
#!/bin/sh
# Valida los trailers obligatorios de la regla A.13 de AGENTS.md.
# Lo instala instalar-reglas.ps1. No editar a mano.

msg_file="$1"
repo_dir=$(git rev-parse --git-dir)

[ -f "$repo_dir/MERGE_MSG" ] && exit 0

cuerpo=$(grep -v '^#' "$msg_file")

case "$cuerpo" in
  "Merge "*|"Revert "*|"fixup!"*|"squash!"*) exit 0 ;;
esac

ia=$(printf '%s\n' "$cuerpo" | sed -n 's/^IA:[[:space:]]*//p' | head -1 | tr -d '\r')
hu=$(printf '%s\n' "$cuerpo" | sed -n 's/^HU:[[:space:]]*//p' | head -1 | tr -d '\r')
revisor=$(printf '%s\n' "$cuerpo" | sed -n 's/^Revisor:[[:space:]]*//p' | head -1 | tr -d '\r')

error=""

case "$ia" in
  agente|asistido|no) ;;
  "") error="${error}  - Falta la linea 'IA:'\n" ;;
  *)  error="${error}  - 'IA: $ia' no es valido. Usar agente, asistido o no.\n" ;;
esac

if [ -z "$hu" ]; then
  error="${error}  - Falta la linea 'HU:'. Usar HU-07, o 'ninguna' si no aplica.\n"
elif ! printf '%s' "$hu" | grep -Eq '^(HU-[0-9]{1,2}|ninguna)$'; then
  error="${error}  - 'HU: $hu' no es valido. Usar HU-07 o 'ninguna'.\n"
fi

if [ -z "$revisor" ]; then
  error="${error}  - Falta la linea 'Revisor:'. Usar un nombre o 'pendiente'.\n"
fi

[ -z "$error" ] && exit 0

cat >&2 <<FIN

  Commit rechazado: faltan datos exigidos por la regla A.13 de AGENTS.md.

$(printf "$error")
  El mensaje tiene que terminar con estas tres lineas:

      IA: agente | asistido | no
      HU: HU-07 | ninguna
      Revisor: nombre | pendiente

  Si no aparecen solas al abrir el editor, correr de nuevo:

      powershell -ExecutionPolicy Bypass -File .\instalar-reglas.ps1

  Para corregir el mensaje que acabas de escribir:

      git commit --edit --file=.git/COMMIT_EDITMSG

FIN

exit 1
'@

# ---------------------------------------------------------------------------
# 3. Escribir los archivos
# ---------------------------------------------------------------------------

# Los scripts de shell tienen que quedar con saltos de linea LF: si quedan con
# CRLF, sh.exe falla con "bad interpreter" y el hook no corre. Por eso se
# escriben con WriteAllText y no con Set-Content.
function Escribir-LF($ruta, $contenido) {
    $texto = $contenido -replace "`r`n", "`n"
    [System.IO.File]::WriteAllText(
        (Join-Path (Get-Location) $ruta),
        $texto,
        (New-Object System.Text.UTF8Encoding $false)
    )
}

if (-not (Test-Path ".githooks")) { New-Item -ItemType Directory ".githooks" | Out-Null }

Escribir-LF ".gitmessage" $plantilla
Escribir-LF ".githooks/commit-msg" $hook

git config commit.template .gitmessage
git config core.hooksPath .githooks

# ---------------------------------------------------------------------------
# 4. Verificar
# ---------------------------------------------------------------------------

$ok = $true
foreach ($f in @(".gitmessage", ".githooks/commit-msg")) {
    if (-not (Test-Path $f)) { Write-Host "ERROR: no se escribio $f" -ForegroundColor Red; $ok = $false }
}
if ((git config commit.template) -ne ".gitmessage") { Write-Host "ERROR: no quedo la plantilla" -ForegroundColor Red; $ok = $false }
if ((git config core.hooksPath) -ne ".githooks")   { Write-Host "ERROR: no quedo el hook" -ForegroundColor Red; $ok = $false }

if (-not $ok) { exit 1 }

Write-Host ""
Write-Host "Listo. A partir de ahora, al hacer 'git commit' se abre el editor" -ForegroundColor Green
Write-Host "con estas tres lineas ya puestas:"
Write-Host ""
Write-Host "    IA:       agente | asistido | no"
Write-Host "    HU:       HU-07 | ninguna"
Write-Host "    Revisor:  nombre | pendiente"
Write-Host ""
Write-Host "Solo hay que completarlas. Si falta alguna, el commit no pasa."
Write-Host "Detalle completo en AGENTS.md, regla A.13."
Write-Host ""
