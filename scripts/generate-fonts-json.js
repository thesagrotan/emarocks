const fs = require('fs');
const path = require('path');
const fontScanner = require('font-scanner');

const fonts = fontScanner.getAvailableFontsSync();
const families = Array.from(new Set(fonts.map(f => f.family))).sort();

const outputPath = path.join(__dirname, '../public/system-fonts.json');
fs.writeFileSync(outputPath, JSON.stringify({ fonts: families }, null, 2));
console.log('System fonts written to public/system-fonts.json');
