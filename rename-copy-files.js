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

// Copy package.json from src to dist
const packageJsonSrc = path.join(srcPath, 'package.json');
const packageJsonDist = path.join(distPath, 'package.json');

if (fs.existsSync(packageJsonSrc)) {
  fs.copyFileSync(packageJsonSrc, packageJsonDist);
  console.log('Copied: package.json');
} else {
  console.warn('package.json not found in src directory');
}

// Copy README.md from repo root to dist so published package has README data
const readmeSrc = path.join(__dirname, 'README.md');
const readmeDist = path.join(distPath, 'README.md');

if (fs.existsSync(readmeSrc)) {
  // Ensure dist directory exists before copying
  if (!fs.existsSync(distPath)) {
    fs.mkdirSync(distPath, { recursive: true });
  }
  fs.copyFileSync(readmeSrc, readmeDist);
  console.log('Copied: README.md');
} else {
  console.warn('README.md not found at repository root');
}
