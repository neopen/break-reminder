const { app, BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');

let mainWindow = null;
let lockWindow = null;
let lockTimer = null;

// 创建主窗口
function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 500,
        height: 750,
        resizable: false,
        frame: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    mainWindow.loadFile('index.html');

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// 创建锁屏窗口（独立窗口，全屏置顶）
function createLockWindow(duration) {
    // 如果已有锁屏窗口，先关闭
    if (lockWindow && !lockWindow.isDestroyed()) {
        lockWindow.close();
    }

    // 清除之前的定时器
    if (lockTimer) {
        clearTimeout(lockTimer);
        lockTimer = null;
    }

    const { width, height } = screen.getPrimaryDisplay().workAreaSize;

    lockWindow = new BrowserWindow({
        width: width,
        height: height,
        fullscreen: true,
        alwaysOnTop: true,
        frame: false,
        transparent: false,
        resizable: false,
        closable: false,
        minimizable: false,
        maximizable: false,
        skipTaskbar: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    // 加载独立的锁屏页面，传递时长参数
    lockWindow.loadFile('lock.html', { query: { duration: duration } });

    // 禁止用户关闭窗口
    lockWindow.on('close', (e) => {
        e.preventDefault();
        return false;
    });

    // 倒计时结束后自动关闭
    lockTimer = setTimeout(() => {
        closeLockWindow();
    }, duration * 1000);
}

// 关闭锁屏窗口
function closeLockWindow() {
    if (lockTimer) {
        clearTimeout(lockTimer);
        lockTimer = null;
    }

    if (lockWindow && !lockWindow.isDestroyed()) {
        lockWindow.close();
        lockWindow = null;
    }
}

// 监听渲染进程消息
ipcMain.on('show-lock', (event, duration) => {
    // 禁用主窗口，防止用户操作
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.setEnabled(false);
    }
    createLockWindow(duration);
});

ipcMain.on('lock-complete', () => {
    closeLockWindow();
    // 恢复主窗口
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.setEnabled(true);
        mainWindow.focus();
    }
});

ipcMain.on('hide-lock', () => {
    closeLockWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.setEnabled(true);
    }
});

// 应用启动
app.whenReady().then(() => {
    createMainWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
    }
});