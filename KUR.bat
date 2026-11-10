@echo off
chcp 65001 >nul
cd /d "%~dp0"
title YouTube Music Desktop - Kurulum
set "PATH=%PATH%;%ProgramFiles%\nodejs;%APPDATA%\npm"

where npm >nul 2>nul
if errorlevel 1 (
  echo [1/4] Node.js bulunamadi, winget ile kuruluyor...
  winget install -e --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
  set "PATH=%PATH%;%ProgramFiles%\nodejs"
)
where npm >nul 2>nul
if errorlevel 1 (
  echo Node.js kurulamadi. https://nodejs.org adresinden LTS surumunu elle kurup tekrar calistirin.
  pause & exit /b 1
)

echo [2/4] Calisan uygulama kapatiliyor...
taskkill /f /im "YouTube Music Desktop.exe" >nul 2>nul
taskkill /f /im electron.exe >nul 2>nul

echo [3/4] Gerekli paketler indiriliyor...
call npm install --no-audit --no-fund
if errorlevel 1 ( echo npm install basarisiz oldu. & pause & exit /b 1 )

echo [4/4] Kurulum dosyasi olusturuluyor...
if exist dist rmdir /s /q dist
set CSC_IDENTITY_AUTO_DISCOVERY=false
call npx electron-builder --win
if errorlevel 1 ( echo Derleme basarisiz oldu. & pause & exit /b 1 )

for %%f in ("dist\*Setup*.exe") do (
  echo Kurulum baslatiliyor: %%~nxf
  start "" "%%f"
  goto :done
)
:done
echo.
echo Bitti! Bu pencereyi kapatabilirsiniz.
pause
