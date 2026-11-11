; Kurulum / guncelleme sirasinda uygulama aciksa (tepside bile) sormadan kapat.
; ONEMLI: /T kullanma! Uygulama ici guncellemede kurulum programini uygulama baslatir;
; /T islem agacini oldurur ve kurulum programini da kapatir (uygulama yeniden acilmaz).
!macro customCheckAppRunning
  DetailPrint "Closing running app..."
  nsExec::Exec `taskkill /F /IM "${APP_EXECUTABLE_FILENAME}"`
  Pop $0
  Sleep 1500
!macroend
