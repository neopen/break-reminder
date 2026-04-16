const fs = require('fs');
const path = require('path');
const { nativeImage, app } = require('electron');

/**
 * 图标管理模块
 * 负责托盘图标的加载和管理
 */
class FaviconManager {
    /**
     * 查找可用的图标文件
     * @param {string} baseDir - 基础目录（通常是 __dirname）
     * @returns {string|null} 图标文件路径
     */
    static findIconFile(baseDir) {
        console.log('[FAVICON] ========== Finding Icon ==========');
        console.log('[FAVICON] Base directory (__dirname):', baseDir);
        console.log('[FAVICON] App path:', app.getAppPath());
        console.log('[FAVICON] Is packaged:', app.isPackaged);
        console.log('[FAVICON] Process cwd:', process.cwd());
        console.log('[FAVICON] Resources path:', process.resourcesPath);
        
        // 构建所有可能的图标路径
        const iconPaths = [];
        
        if (app.isPackaged) {
            // 生产环境 - 打包后的路径
            iconPaths.push(
                // 与 exe 同级的 resources 目录
                path.join(process.resourcesPath, 'app.asar', 'src', 'renderer', 'icons', 'icon-32.ico'),
                path.join(process.resourcesPath, 'app', 'src', 'renderer', 'icons', 'icon-32.ico'),
                path.join(process.resourcesPath, 'src', 'renderer', 'icons', 'icon-32.ico'),
                path.join(process.resourcesPath, 'icons', 'icon-32.ico'),
                // app.getAppPath() 返回的路径
                path.join(app.getAppPath(), 'src', 'renderer', 'icons', 'icon-32.ico'),
                path.join(app.getAppPath(), 'renderer', 'icons', 'icon-32.ico'),
                // 相对于 main.js 的路径
                path.join(baseDir, 'renderer', 'icons', 'icon-32.ico'),
                // 绝对路径备用
                path.join(path.dirname(app.getPath('exe')), 'resources', 'icons', 'icon-32.ico')
            );
        } else {
            // 开发环境
            // baseDir 通常是: .../HealthClock/src/main/utils
            // 所以需要向上两级，再进入 renderer/icons
            iconPaths.push(
                // 相对路径（推荐）
                path.join(baseDir, '../../renderer/icons/icon-32.ico'),
                path.join(baseDir, '../../renderer/icons/icon-64.ico'),
                path.join(baseDir, '../../renderer/icons/icon-128.ico'),
                path.join(baseDir, '../../renderer/icons/icon-256.ico'),
                // 使用 process.cwd()（项目根目录）
                path.join(process.cwd(), 'src/renderer/icons/icon-32.ico'),
                path.join(process.cwd(), 'src/renderer/icons/icon-64.ico'),
                // 使用 __dirname 的不同组合
                path.join(__dirname, '../../renderer/icons/icon-32.ico'),
                // 绝对路径备用
                path.resolve(baseDir, '../../renderer/icons/icon-32.ico')
            );
        }
        
        // 添加 .ico 和 .png 格式的备用路径
        const additionalPaths = [
            path.join(baseDir, 'favicon.ico'),
            path.join(process.cwd(), 'favicon.ico'),
            path.join(process.cwd(), 'icon-32.ico')
        ];
        
        const allPaths = [...iconPaths, ...additionalPaths];
        
        // 去重
        const uniquePaths = [...new Set(allPaths)];
        
        console.log('[FAVICON] Checking paths:');
        let foundPath = null;
        
        for (const iconPath of uniquePaths) {
            // 规范化路径
            const normalizedPath = path.normalize(iconPath);
            console.log('[FAVICON]   Checking:', normalizedPath);
            
            try {
                // 检查文件是否存在
                if (fs.existsSync(normalizedPath)) {
                    console.log('[FAVICON]   ✓ File exists!');
                    
                    // 尝试加载图标
                    try {
                        const image = nativeImage.createFromPath(normalizedPath);
                        if (!image.isEmpty()) {
                            const size = image.getSize();
                            console.log('[FAVICON]   ✓ Icon loaded successfully! Size:', size.width, 'x', size.height);
                            foundPath = normalizedPath;
                            break;
                        } else {
                            console.log('[FAVICON]   ✗ Icon image is empty');
                        }
                    } catch (loadError) {
                        console.log('[FAVICON]   ✗ Failed to load image:', loadError.message);
                    }
                } else {
                    console.log('[FAVICON]   ✗ File not found');
                }
            } catch (e) {
                console.log('[FAVICON]   ✗ Error checking path:', e.message);
            }
        }
        
        if (foundPath) {
            console.log('[FAVICON] ========== Found Icon ==========');
            console.log('[FAVICON] Path:', foundPath);
        } else {
            console.log('[FAVICON] ========== No Icon Found ==========');
            console.log('[FAVICON] Will use generated fallback icon');
            
            // 列出实际目录内容以便调试
            try {
                const iconsDir = path.join(process.cwd(), 'src/renderer/icons');
                console.log('[FAVICON] Listing contents of:', iconsDir);
                if (fs.existsSync(iconsDir)) {
                    const files = fs.readdirSync(iconsDir);
                    console.log('[FAVICON] Directory contents:', files);
                } else {
                    console.log('[FAVICON] Icons directory does not exist at:', iconsDir);
                }
            } catch (e) {
                console.log('[FAVICON] Could not list directory:', e.message);
            }
        }
        
        return foundPath;
    }
    
    /**
     * 创建托盘图标
     * @param {string} baseDir - 基础目录
     * @returns {Electron.Tray|null} 托盘实例
     */
    static createTrayIcon(baseDir) {
        console.log('[FAVICON] Creating tray icon');
        try {
            const { Tray } = require('electron');
            const trayIconPath = this.findIconFile(baseDir);
            
            if (trayIconPath) {
                console.log('[FAVICON] Creating tray with icon:', trayIconPath);
                const tray = new Tray(trayIconPath);
                
                // macOS 特定设置
                if (process.platform === 'darwin') {
                    tray.setPressedImage(trayIconPath);
                }
                
                console.log('[FAVICON] Tray created successfully');
                return tray;
            } else {
                // 创建备用托盘图标
                console.log('[FAVICON] Creating fallback tray icon');
                return this.createFallbackTray();
            }
        } catch (error) {
            console.error('[FAVICON] Error creating tray:', error);
            return this.createFallbackTray();
        }
    }
    
    /**
     * 创建备用托盘图标（简单的蓝色圆形）
     * @returns {Electron.Tray|null}
     */
    static createFallbackTray() {
        try {
            const { Tray } = require('electron');
            
            // 创建一个简单的时钟图标（32x32 像素）
            const canvas = `
                <svg width="32" height="32" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="16" cy="16" r="14" fill="#667eea" stroke="#5a67d8" stroke-width="2"/>
                    <circle cx="16" cy="16" r="10" fill="none" stroke="white" stroke-width="2"/>
                    <line x1="16" y1="16" x2="16" y2="9" stroke="white" stroke-width="2" stroke-linecap="round"/>
                    <line x1="16" y1="16" x2="20" y2="20" stroke="white" stroke-width="2" stroke-linecap="round"/>
                    <circle cx="16" cy="16" r="2" fill="white"/>
                </svg>
            `;
            
            const iconDataURL = `data:image/svg+xml;base64,${Buffer.from(canvas).toString('base64')}`;
            const image = nativeImage.createFromDataURL(iconDataURL);
            const tray = new Tray(image);
            
            console.log('[FAVICON] Fallback tray created with SVG icon');
            return tray;
        } catch (error) {
            console.error('[FAVICON] Failed to create fallback tray:', error);
            return null;
        }
    }
}

module.exports = FaviconManager;