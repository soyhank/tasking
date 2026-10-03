# Tasking - instala el programa de WhatsApp en esta PC (no necesita administrador).
# Se ejecuta con el comando que muestra la pagina Ajustes de tu Tasking:
#   $env:TASKING_URL='https://...'; $env:TASKING_KEY='...'; irm https://raw.githubusercontent.com/soyhank/tasking/main/worker/instalar.ps1 | iex
$ErrorActionPreference = 'Stop'
$url = $env:TASKING_URL
$clave = $env:TASKING_KEY
if (-not $url -or -not $clave) {
  Write-Host 'Copia el comando completo desde la pagina Ajustes de tu Tasking.' -ForegroundColor Red
  return
}
$repo = if ($env:TASKING_REPO) { $env:TASKING_REPO } else { 'soyhank/tasking' }

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host 'Falta Node.js. Instala la version LTS desde https://nodejs.org y vuelve a pegar el comando.' -ForegroundColor Red
  Start-Process 'https://nodejs.org/es/download'
  return
}

$destino = Join-Path $env:LOCALAPPDATA 'Tasking\whatsapp'
$tmp = Join-Path $env:TEMP ("tasking-" + (Get-Random))
New-Item -ItemType Directory -Force $tmp | Out-Null

Write-Host 'Descargando Tasking...'
Invoke-WebRequest "https://codeload.github.com/$repo/zip/refs/heads/main" -OutFile "$tmp\tasking.zip" -UseBasicParsing
Expand-Archive "$tmp\tasking.zip" -DestinationPath $tmp -Force
$origen = Get-ChildItem $tmp -Directory | Where-Object { Test-Path (Join-Path $_.FullName 'worker\index.mjs') } | Select-Object -First 1
if (-not $origen) { throw 'No se encontro el programa dentro de la descarga.' }

# Si ya estaba instalado se apaga primero; la sesion de WhatsApp (carpeta sesion) se conserva
if (Test-Path "$destino\servicio.mjs") { & node "$destino\servicio.mjs" --desinstalar | Out-Null }
New-Item -ItemType Directory -Force $destino | Out-Null
Copy-Item "$($origen.FullName)\worker\*" $destino -Recurse -Force
"APP_URL=$url`r`nTASKING_KEY=$clave" | Set-Content "$destino\.env" -Encoding ascii

Write-Host 'Instalando dependencias (puede tardar un minuto)...'
Push-Location $destino
& npm.cmd install --omit=dev --no-audit --no-fund --loglevel=error
Pop-Location

& node "$destino\servicio.mjs" --instalar
Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
Write-Host ''
Write-Host 'Listo. Vuelve a la pagina WhatsApp de Tasking y escanea el QR con el celular del chip.' -ForegroundColor Green
Write-Host "Instalado en $destino. Para quitarlo: node `"$destino\servicio.mjs`" --desinstalar"
