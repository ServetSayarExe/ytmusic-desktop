// Paketlemeden sonra .exe dosyasına kendi simgemizi göm (winCodeSign gerektirmez)
const path = require('path');

exports.default = async function (context) {
  if (context.electronPlatformName !== 'win32') return;
  const mod = require('rcedit');
  const exe = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.exe`);
  const fn = typeof mod === 'function' ? mod : (mod.rcedit || mod.default);
  await fn(exe, {
    icon: path.join(__dirname, 'icon.ico'),
    'version-string': {
      ProductName: 'YouTube Music Desktop',
      FileDescription: 'YouTube Music Desktop'
    }
  });
  console.log('Simge eklendi:', exe);
};
