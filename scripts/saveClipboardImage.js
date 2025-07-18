const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const screenshotPath = path.resolve(__dirname, '../screenshots/latest-bug.png');

try {
  execSync(`powershell -command "Add-Type -AssemblyName System.Windows.Forms; Add-Type -AssemblyName System.Drawing; $img = [Windows.Forms.Clipboard]::GetImage(); if ($img -ne $null) { $img.Save('${screenshotPath.replace(/\\/g, '\\\\')}', [System.Drawing.Imaging.ImageFormat]::Png) }"`);

  if (fs.existsSync(screenshotPath)) {
    console.log('✅ Screenshot saved from clipboard.');
    process.exit(0);
  } else {
    console.log('⚠️ No image found in clipboard.');
    process.exit(1);
  }
} catch (err) {
  console.error('❌ Failed to read clipboard image:', err.message);
  process.exit(1);
}
