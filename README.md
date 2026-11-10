# YouTube Music Desktop

YouTube Music'i kendi penceresinde açan masaüstü uygulaması. Google hesabınla giriş yaparsın, Premium aboneliğin olduğu gibi çalışır.

## 1.8 ile gelenler

- **Şarkı sözü çevirisi:** sözler panelinde ve tam ekranda "Çeviri" düğmesi; her satırın altında Türkçesi çıkar
- **Ses yükseltme:** sessiz kayıtlar için sesi %200'e kadar aç (cızırtı önleyici sınırlayıcıyla)

## 1.7 ile gelenler

- **Sıradakiler paneli:** sağda Spotify gibi kuyruk listesi; tıkladığın şarkıya geçer
- **Ses menüsü:** oynatma hızı (0,75x–1,5x), yumuşak geçiş (crossfade), ses çıkış cihazı seçimi
- **"Sana özel" ana sayfa:** selamlama, kitaplık kısayolları ve son çaldıkların
- **Şarkı kartı:** çalan şarkıyı kapaklı şık bir görsel olarak kopyala ya da kaydet
- **Görev çubuğunda ilerleme:** şarkının ilerleyişi uygulama simgesinde görünür
- **Yıllık özet:** hikâye gibi akan animasyonlu slaytlar, sonunda kaydedilebilir özet kartı
- **Dinleme hedefleri:** günlük hedef, seri ve 13 rozet

## 1.5 ile gelenler

- **Ayarlar penceresi** (tepsi → Ayarlar): tüm seçenekler tek yerde, değişiklikler anında uygulanır
- **Tema seçenekleri:** Koyu, AMOLED siyah, Kapak renkli + yumuşak şarkı geçiş animasyonları
- **Ekolayzer:** 5 bant, hazır ayarlar (Bas güçlendirme, Vokal, Rap / Hip-hop…), ses seviyesi eşitleme
- **Uyku zamanlayıcı:** 15 dk – 1,5 saat ya da "bu şarkı bitince"; müzik yavaşça kısılıp durur
- **Mini oynatıcı:** her zaman üstte duran küçük pencere (sağ alttaki düğme, tepsi ya da `Ctrl+Shift+M`)
- **Tam ekran mod:** büyük kapak, hareketli renkli arka plan, akan sözler (Esc ile çıkış)
- **Şarkıyı paylaş:** tek tıkla bağlantıyı kopyalar
- **İstatistikler ve geçmiş:** en çok dinlediğin şarkılar/sanatçılar, saat grafiği, aranabilir geçmiş (sadece bu bilgisayarda saklanır)
- **Otomatik güncelleme altyapısı:** GitHub'a bağlanınca uygulama kendini günceller

## Kurulum (Windows)

1. https://nodejs.org adresinden **Node.js LTS** sürümünü kur.
2. Bu klasörü bir yere çıkar.
3. **Hemen denemek için:** `BASLAT.bat` dosyasına çift tıkla.
4. **Gerçek bir program olarak kurmak için:** `KUR.bat` dosyasına çift tıkla. `dist` klasöründe bir Setup `.exe` oluşur; onu çalıştırınca masaüstüne ve Başlat menüsüne kısayol eklenir.

İlk açılışta sağ üstten **Oturum aç** de, bir kez giriş yapman yeterli; oturum hatırlanır.

## Özellikler

- **Modern tema:** cam efektli arayüz, çalan şarkının kapağından bulanık arka plan, yuvarlatılmış kapaklar, kendi başlık çubuğu. Tepsi simgesine sağ tık → **Modern tema** ile açılıp kapatılır (`theme.css` dosyasından renkleri değiştirebilirsin)

- **Şarkı sözleri:** sağ alttaki **Sözler** düğmesi; şarkıyla senkron akar, bir satıra tıklayınca oraya atlar (kaynak: lrclib.net)
- **Discord durumu:** Discord açıksa profilinde otomatik olarak "YouTube Music dinliyor" görünür (tepsi → **Discord'da göster** ile kapatılabilir)
- **Görev çubuğu:** simgenin üstüne gelince önceki/oynat/sonraki tuşları; şarkı değişince bildirim (tepsiden kapatılabilir)
- **Spotify tarzı çalma listeleri:** gölgeli kapak kartı, büyük başlık, vurgu renginde oynat tuşu, numaralı şarkı listesi, çalan şarkı renkli
- **Kapak rengi:** vurgu rengi ve arka plan çalan şarkının kapağına göre değişir
- **Daha hızlı:** reklam/izleyici istekleri engellenir, bağlantılar açılışta önceden hazırlanır
- Kapat tuşu uygulamayı sistem tepsisine küçültür, müzik çalmaya devam eder (tamamen kapatmak için tepsi simgesi → Çıkış)
- Tepsi menüsünden oynat/duraklat, sonraki, önceki
- Klavyedeki medya tuşları çalışır
- Kısayollar: `Ctrl+Shift+Boşluk` oynat/duraklat, `Ctrl+Shift+→` sonraki, `Ctrl+Shift+←` önceki
- Pencere boyutu ve konumu hatırlanır
- Dış linkler normal tarayıcında açılır

## Sorun giderme

- **"Bu tarayıcı güvenli olmayabilir" hatası:** Google bazen gömülü tarayıcıları engeller. Tekrar dene; olmazsa `main.js` içindeki `UA` satırındaki Chrome sürüm numarasını güncel sürümle değiştir.
- **Mac / Linux:** `npm install` sonra `npm start`; kurulum dosyası için `npm run build:mac` veya `npm run build:linux`.
