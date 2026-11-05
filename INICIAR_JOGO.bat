@echo off
chcp 65001 > nul
title Bluey: Vamos Brincar! — Servidor Educacional Web
cd /d "%~dp0"
echo ============================================================
echo   BLUEY: VAMOS BRINCAR! (Edicao Educacional Desbloqueada)
echo ============================================================
echo.
echo Iniciando servidor local em: http://localhost:8080
echo Abrindo o navegador...
start http://localhost:8080/index.html
python -m http.server 8080

