@echo off
cd /d "%~dp0"
set "PATH=%PATH%;%ProgramFiles%\nodejs"
if not exist node_modules\electron\dist\electron.exe (
  echo Ilk calistirma: gerekli dosyalar indiriliyor...
  call npm install --no-audit --no-fund
)
rem Siyah pencere acik kalmasin: uygulamayi ayri baslat ve cik
start "" "node_modules\electron\dist\electron.exe" .
exit
