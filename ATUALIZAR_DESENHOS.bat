@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ===================================================
echo   ATUALIZANDO DESENHOS DE COLORIR (assets/colouring)
echo ===================================================
python atualizar_desenhos.py
echo.
echo Pronto! Agora basta atualizar a pagina (F5) no navegador.
pause

