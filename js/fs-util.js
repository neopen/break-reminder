// 文件系统工具模块
const FileSystemUtil = (function () {
    let _fs = null;
    let _initialized = false;
    
    // 初始化文件系统
    function init() {
        if (_initialized) return true;
        
        if (typeof process !== 'undefined' && process.versions && process.versions.electron) {
            try {
                _fs = require('fs');
                _initialized = true;
                return true;
            } catch (e) {
                console.warn('FileSystemUtil: File system not available');
                return false;
            }
        }
        return false;
    }
    
    // 获取 HealthClock 根目录路径
    function getRootPath() {
        if (!_initialized && !init()) {
            return null;
        }
        
        try {
            const path = require('path');
            const { app } = require('electron').remote || require('electron');
            const userDataPath = app ? app.getPath('userData') : (process.env.APPDATA || process.env.HOME);
            return path.join(userDataPath, 'HealthClock');
        } catch (e) {
            console.warn('FileSystemUtil: Failed to get root path:', e);
            return null;
        }
    }
    
    // 确保目录存在
    function ensureDir(dirPath) {
        if (!_initialized && !init()) {
            return false;
        }
        
        try {
            // 尝试读取目录信息，如果不存在会抛出异常
            _fs.statSync(dirPath);
        } catch (e) {
            // 目录不存在，创建目录
            try {
                _fs.mkdirSync(dirPath, { recursive: true });
            } catch (mkdirError) {
                console.warn('FileSystemUtil: Failed to create directory:', mkdirError);
                return false;
            }
        }
        return true;
    }
    
    // 确保 HealthClock 根目录存在
    function ensureRootDir() {
        const rootPath = getRootPath();
        if (!rootPath) return false;
        return ensureDir(rootPath);
    }
    
    // 确保子目录存在
    function ensureSubDir(subDir) {
        const rootPath = getRootPath();
        if (!rootPath) return false;
        
        const dirPath = require('path').join(rootPath, subDir);
        return ensureDir(dirPath);
    }
    
    // 读取文件
    function readFile(filePath) {
        if (!_initialized && !init()) {
            return null;
        }
        
        try {
            // 直接尝试读取文件，如果不存在会抛出异常
            return _fs.readFileSync(filePath, 'utf8');
        } catch (e) {
            // 文件不存在或读取失败，返回 null
            return null;
        }
    }
    
    // 写入文件
    function writeFile(filePath, content) {
        if (!_initialized && !init()) {
            return false;
        }
        
        try {
            const dirPath = require('path').dirname(filePath);
            ensureDir(dirPath);
            _fs.writeFileSync(filePath, content, 'utf8');
            return true;
        } catch (e) {
            console.warn('FileSystemUtil: Failed to write file:', e);
            return false;
        }
    }
    
    return {
        init,
        getRootPath,
        ensureDir,
        ensureRootDir,
        ensureSubDir,
        readFile,
        writeFile
    };
})();