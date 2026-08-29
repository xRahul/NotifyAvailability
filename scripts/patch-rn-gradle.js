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
  const kotlinDesired = '2.2.20';
  const agpDesired = '8.12.3';
  let kotlinPatched = false;
  let agpPatched = false;

  // kotlin: handle 2.4.0, 2.2.10, 2.2.0 -> 2.2.20 (2.2.20 = already)
  const kotlinVersions = ['2.4.0', '2.2.10', '2.2.0'];
  for (const v of kotlinVersions) {
    const from = `kotlin = "${v}"`;
    const to = `kotlin = "${kotlinDesired}"`;
    if (content.includes(from)) {
      content = content.replace(from, to);
      kotlinPatched = true;
    }
  }

  // agp: handle 9.2.1 -> 8.12.3 (8.12.3 = already)
  if (content.includes('agp = "9.2.1"')) {
    content = content.replace('agp = "9.2.1"', `agp = "${agpDesired}"`);
    agpPatched = true;
  }

  const hasDesiredKotlin = content.includes(`kotlin = "${kotlinDesired}"`);
  const hasDesiredAgp = content.includes(`agp = "${agpDesired}"`);

  if (kotlinPatched || agpPatched) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('patch: applied kotlin 2.2.20 agp 8.12.3 to RN gradle plugin');
  } else if (hasDesiredKotlin && hasDesiredAgp) {
    console.log('patch: already at 2.2.20/8.12.3');
  } else {
    console.log('patch: no matching version found');
  }
} catch (e) {
  console.error('patch failed', e);
  process.exit(0);
}
