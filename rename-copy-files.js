const fs = require('fs');
const path = require('path');

const distPath = path.resolve(__dirname, 'dist/dev-gc');
const srcPath = path.resolve(__dirname, 'src');

const renameMap = [
  {
    from: 'main.js',
    to: 'GChart.js'
  }
];

renameMap.forEach(({ from, to }) => {
  const oldPath = path.join(distPath, from);
  const newPath = path.join(distPath, to);

  if (fs.existsSync(oldPath)) {
    fs.renameSync(oldPath, newPath);
    console.log(`Renamed: ${from} ➜ ${to}`);
  } else {
    console.warn(`File not found: ${from}`);
  }
});

// // Copy package.json from src to dist
// const packageJsonSrc = path.join(srcPath, 'package.json');
// const packageJsonDist = path.join(distPath, 'package.json');

// if (fs.existsSync(packageJsonSrc)) {
//   fs.copyFileSync(packageJsonSrc, packageJsonDist);
//   console.log('Copied: package.json');
// } else {
//   console.warn('package.json not found in src directory');
// }
