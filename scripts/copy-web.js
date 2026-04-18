const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'src', 'renderer');
const DOCS_DIR = path.join(ROOT_DIR, 'docs');

console.log('🔨 Building web version for GitHub Pages...\n');

// 清空并创建 docs 目录
if (fs.existsSync(DOCS_DIR)) {
    fs.rmSync(DOCS_DIR, { recursive: true, force: true });
    console.log('  🗑️  Cleared docs/');
}
fs.mkdirSync(DOCS_DIR, { recursive: true });

// 复制所有渲染进程文件到 docs
console.log('\n📦 Copying renderer to docs...');
copyDir(SRC_DIR, DOCS_DIR);

// 创建 CNAME 等配置文件
fs.writeFileSync(path.join(DOCS_DIR, 'CNAME'), 'clock.pengline.cn');
fs.writeFileSync(path.join(DOCS_DIR, '.nojekyll'), '');
fs.writeFileSync(path.join(DOCS_DIR, 'robots.txt'), 'User-agent: *\nAllow: /\n');

console.log('\n✨ Web build complete!');
console.log('📂 Output: docs/');

function copyDir(src, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}