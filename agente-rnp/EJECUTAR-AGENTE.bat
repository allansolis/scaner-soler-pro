@echo off
echo ============================================
echo   AGENTE LEGAL RNP - Valor Fiscal Fincas
echo ============================================
echo.
echo Procesando 715 fincas del Excel...
echo (El navegador se abrira automaticamente)
echo.
cd /d "C:\Users\Usuario\Desktop\Scaner Soler\agente-rnp"
node agente-rnp.js
echo.
echo Proceso completado. Revisa Remates 2026.xlsx
pause
