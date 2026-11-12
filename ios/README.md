# YouTube Music – iPhone

Kişisel kullanım için iPhone sürümü. App Store'da yok; AltStore ile kurulur.

## Kurulum
1. iPhone'da Safari ile şu dosyayı indir:
   https://github.com/ServetSayarExe/ytmusic-desktop/releases/download/ios-latest/YouTube-Music-iPhone.ipa
2. AltStore → **Uygulamalarım** → sol üstteki **+** → İndirilenler'den `YouTube-Music-iPhone.ipa`'yı seç.
   (Bilgisayarda AltServer açık, telefon ve bilgisayar aynı Wi-Fi'de olmalı.)
3. Ücretsiz Apple hesabıyla imza 7 günde bir yenilenmeli; AltStore bunu aynı Wi-Fi'de kendisi yapar.

## Neler var
- Apple Music tarzı native oynatıcı: kapak renginden dinamik, göz yormayan arka plan; yaylı animasyonlar; 120 Hz
- Mini oynatıcı (dokun ya da yukarı kaydır → tam ekran, aşağı kaydır → kapat)
- Dynamic Island ve kilit ekranında kapak, ilerleme ve kontroller
- Arka planda ve ekran kilitliyken çalma
- Bilgisayarı kontrol etme (Spotify gibi): oynatıcıdaki cihaz düğmesi → bilgisayardaki Telefon kumandası QR'ını okut. Aynı Wi-Fi gerekir.
- Reklam atlayıcı
- Aşağı çekince sayfayı yenileme

`ios/` klasöründe bir değişiklik olunca GitHub Actions yeni `.ipa`'yı otomatik derler.
