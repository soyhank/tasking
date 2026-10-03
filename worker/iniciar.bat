@echo off
title Tasking - WhatsApp
cd /d "%~dp0"
if not exist node_modules (
  echo Instalando por primera vez...
  call npm install --omit=dev
)
:bucle
node index.mjs
echo El programa se detuvo. Se reinicia en 10 segundos (cierra esta ventana para apagarlo).
timeout /t 10 /nobreak >nul
goto bucle
