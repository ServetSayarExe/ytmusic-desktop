; Kurulum / guncelleme sirasinda uygulama aciksa (tepside bile) sormadan kapat.
!macro customCheckAppRunning
  DetailPrint "Closing running app..."
  nsExec::Exec `taskkill /F /T /IM "${APP_EXECUTABLE_FILENAME}"`
  Pop $0
  Sleep 1200
!macroend
