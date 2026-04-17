// scripts/build-web.js

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'src', 'renderer');
const DOCS_DIR = path.join(ROOT_DIR, 'docs');

console.log('🔨 Building web version for GitHub Pages...\n');

// ========== 1. 清空并创建 docs 目录 ==========
if (fs.existsSync(DOCS_DIR)) {
    fs.rmSync(DOCS_DIR, { recursive: true, force: true });
    console.log('  🗑️  Cleared docs/ directory');
}
fs.mkdirSync(DOCS_DIR, { recursive: true });
console.log('  📁 Created docs/ directory\n');

// ========== 2. 复制静态资源 ==========
console.log('📦 Copying static assets...');

const staticItems = [
    { src: 'css', dest: 'css' },
    { src: 'icons', dest: 'icons' },
    { src: 'js', dest: 'js' },
    { src: 'manifest.json', dest: 'manifest.json' }
];

staticItems.forEach(item => {
    const src = path.join(SRC_DIR, item.src);
    const dest = path.join(DOCS_DIR, item.dest);

    if (fs.existsSync(src)) {
        copyRecursive(src, dest);
        console.log(`  ✅ ${item.src}`);
    } else {
        console.log(`  ⚠️  Missing: ${item.src}`);
    }
});

// ========== 3. 创建 Web 适配脚本 ==========
console.log('\n📝 Creating web adapter...');

const webAdapter = `// Web 适配层 - 模拟 Electron 环境
(function() {
    console.log('[Web Adapter] Initializing...');
    
    // 模拟 require 函数
    window.require = function(module) {
        console.log('[Web Adapter] require:', module);
        if (module === 'electron') {
            return {
                ipcRenderer: {
                    send: function() {},
                    sendSync: function() { return null; },
                    on: function() {},
                    once: function() {},
                    removeListener: function() {}
                }
            };
        }
        if (module === 'fs') {
            return {
                existsSync: function() { return false; },
                mkdirSync: function() {},
                readFileSync: function() { return null; },
                writeFileSync: function() {}
            };
        }
        if (module === 'path') {
            return {
                join: function(...args) { return args.join('/'); },
                dirname: function(p) { return p.split('/').slice(0, -1).join('/'); },
                basename: function(p) { return p.split('/').pop(); }
            };
        }
        return {};
    };
    
    // 模拟文件系统模块
    window.FileSystemManager = window.FileSystemManager || {
        init: function() { return false; },
        isUsingLocalFile: function() { return false; },
        getFileSystemUtil: function() { return null; },
        buildFilePath: function() { return null; }
    };
    
    window.FileSystemUtil = window.FileSystemUtil || {
        init: function() { return false; },
        getRootPath: function() { return null; },
        ensureDir: function() { return false; },
        readFile: function() { return null; },
        writeFile: function() { return false; }
    };
    
    // 模拟 AudioModule
    if (!window.AudioModule) {
        window.AudioModule = {
            setEnabled: function() {},
            setLockedGetter: function() {},
            playAlert: function() {},
            startContinuous: function() {},
            stopContinuous: function() {},
            resume: function() { return Promise.resolve(); }
        };
    }
    
    // 模拟 NotificationModule
    if (!window.NotificationModule) {
        window.NotificationModule = {
            init: function() { return Promise.resolve(false); },
            initWithoutWait: function() {},
            setEnabled: function() {},
            send: function() { return Promise.resolve(false); },
            sendReminder: function() { return Promise.resolve(false); },
            sendTest: function() { return Promise.resolve(false); }
        };
    }
    
    // 禁用 Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register = function() {
            return Promise.reject(new Error('Service Worker disabled'));
        };
    }
    
    console.log('[Web Adapter] Initialized');
})();`;

fs.writeFileSync(path.join(DOCS_DIR, 'js', 'web-adapter.js'), webAdapter);
console.log('  ✅ js/web-adapter.js');

// ========== 4. 处理 HTML 文件 ==========
console.log('\n📄 Processing HTML files...');

// 处理 index.html
const indexSrc = path.join(SRC_DIR, 'index.html');
const indexDest = path.join(DOCS_DIR, 'index.html');

if (fs.existsSync(indexSrc)) {
    let html = fs.readFileSync(indexSrc, 'utf-8');
    html = processHTML(html, 'index');
    fs.writeFileSync(indexDest, html, 'utf-8');
    console.log('  ✅ index.html');
}

// 处理 lock.html
const lockSrc = path.join(SRC_DIR, 'lock.html');
const lockDest = path.join(DOCS_DIR, 'lock.html');

if (fs.existsSync(lockSrc)) {
    let html = fs.readFileSync(lockSrc, 'utf-8');
    html = processHTML(html, 'lock');
    fs.writeFileSync(lockDest, html, 'utf-8');
    console.log('  ✅ lock.html');
}

// ========== 5. 创建配置文件 ==========
console.log('\n⚙️  Creating configuration files...');

fs.writeFileSync(path.join(DOCS_DIR, '.nojekyll'), '');
fs.writeFileSync(path.join(DOCS_DIR, 'robots.txt'), `User-agent: *
Allow: /
`);
console.log('  ✅ .nojekyll, robots.txt');

console.log('\n✨ Web build complete!');
console.log(`📂 Output: ${DOCS_DIR}`);
console.log('🌐 Test: npx serve docs\n');

// ========== 辅助函数 ==========

function copyRecursive(src, dest) {
    const stat = fs.statSync(src);

    if (stat.isDirectory()) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }
        const entries = fs.readdirSync(src);
        for (const entry of entries) {
            copyRecursive(path.join(src, entry), path.join(dest, entry));
        }
    } else {
        fs.copyFileSync(src, dest);
    }
}


function processHTML(html, type) {
    // 1. 插入 Web 适配脚本（在所有脚本之前）
    html = html.replace(
        /<script src="\.\/js\/shared\/constants\.js">/,
        '<script src="./js/web-adapter.js"></script>\n    <script src="./js/shared/constants.js">'
    );

    // 2. 添加 Web 提示条（固定定位，不影响原有布局）
    const webNotice = `
    <div style="position: fixed; top: 0; left: 0; right: 0; width: 100%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-align: center; padding: 8px 16px; font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 16px; z-index: 9999; box-shadow: 0 2px 8px rgba(0,0,0,0.1); box-sizing: border-box;">
        <span>⚡ Web 演示版 · 完整功能请下载桌面版</span>
        <a href="https://github.com/neopen/active-break-clock/releases" target="_blank" style="background: white; color: #667eea; padding: 4px 16px; border-radius: 20px; text-decoration: none; font-weight: 600; font-size: 12px; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">📥 下载</a>
    </div>
    <div style="height: 40px;"></div>`;

    // 将提示条插入到 body 开始标签之后，并添加一个占位 div
    html = html.replace('<body>', '<body>\n' + webNotice);

    // 3. 移除原有的下载桌面版链接（在 status-bar-right 中）
    html = html.replace(
        /<div class="status-bar-right">[\s\S]*?<\/div>/g,
        '<div class="status-bar-right"></div>'
    );

    // 4. 添加 Web 模式标识
    html = html.replace('<body>', '<body data-mode="web">');

    // 5. 处理 lock.html 特殊情况
    if (type === 'lock') {
        // 确保 lock.html 中的脚本在 Web 环境下正常工作
        html = html.replace(
            /if\s*\(\s*typeof\s+window\s*!==\s*'undefined'\s*&&\s*window\.require\s*\)\s*\{/g,
            'if (false) { // Web: Electron IPC disabled'
        );
    }

    return html;
}