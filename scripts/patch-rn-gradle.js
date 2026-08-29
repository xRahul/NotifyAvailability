const fs = require('fs');
const path = require('path');
const file = path.join(
  __dirname,
  '..',
  'node_modules',
  '@react-native',
  'gradle-plugin',
  'gradle',
  'libs.versions.toml',
);
try {
  if (!fs.existsSync(file)) {
    console.log('patch: file not found, skipping');
    process.exit(0);
  }
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('kotlin = "2.4.0"')) {
    console.log('patch: already patched');
    process.exit(0);
  }
  if (content.includes('kotlin = "2.2.0"')) {
    content = content.replace('kotlin = "2.2.0"', 'kotlin = "2.4.0"');
    fs.writeFileSync(file, content, 'utf8');
    console.log('patch: applied kotlin 2.4.0 to RN gradle plugin');
  } else {
    console.log('patch: no matching kotlin version found');
  }
} catch (e) {
  console.error('patch failed', e);
  process.exit(0);
}
