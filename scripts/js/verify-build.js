
const fs = require("fs");
const path = require("path");

const requiredPaths = [
  "dist/main/main.js",
  "dist/preload",
  "dist/renderer",
  "build/icon.svg"
];

let failed = false;

for (const item of requiredPaths) {
  const target = path.resolve(process.cwd(), item);

  if (!fs.existsSync(target)) {
    console.error(`[ERROR] Missing: ${item}`);
    failed = true;
  } else {
    console.log(`[OK] ${item}`);
  }
}

if (failed) {
  console.error("\nBuild verification failed.");
  process.exit(1);
}

console.log("\nBuild verification passed.");
