/**
 * HealthClock - Neutralino.js 主进程入口
 * 优化：日志路径指向项目根目录 logs 文件夹，统一接收渲染层日志
 */
const { app, window, os, filesystem, process, events, debug } = require('@neutralinojs/lib');

// ============ 日志系统初始化 ============
// 强制日志路径为项目运行目录下的 logs 文件夹
const LOG_DIR_PATH = path.join(process.cwd(), 'logs');
let logFilePath = null;

// 同步创建日志目录（确保后续 console 重写时路径已存在）
try {
  const today = new Date().toISOString().split('T')[0];
  logFilePath = path.join(LOG_DIR_PATH, `HealthClock_${today}.log`);
  console.log(`[Main] Log file initialized: ${logFilePath}`);
} catch (e) {
  console.error('[Main] Failed to create log directory:', e);
}

/**
 * 重写主进程 console
 */
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error
};

console.log = (...args) => {
  const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
  const content = `[${new Date().toISOString()}] [INFO] ${msg}`;
  writeLogToFile(content);
  originalConsole.log(content);
};

console.warn = (...args) => {
  const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
  const content = `[${new Date().toISOString()}] [WARN] ${msg}`;
  writeLogToFile(content);
  originalConsole.warn(content);
};

console.error = (...args) => {
  const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
  const content = `[${new Date().toISOString()}] [ERROR] ${msg}`;
  writeLogToFile(content);
  originalConsole.error(content);
};

// ============ 窗口与事件管理 ============
let mainWindowId = 'main';
let lockWindowId = 'lock';

function setupEventHandlers() {
  // ✅ 监听渲染层发来的日志事件
  events.on('log-render', (data) => {
    const { level, msg } = data.detail || {};
    const prefix = level === 'error' ? '[ERROR]' : level === 'warn' ? '[WARN]' : '[INFO]';
    const content = `[${new Date().toISOString()}] [Renderer] ${prefix} ${msg}`;
    writeLogToFile(content);
    // 打印到终端以便开发调试
    originalConsole.log(content);
  });

  // 显示锁屏
  events.on('show-lock', async (data) => {
    const detail = data.detail || {};
    console.log(`[IPC] show-lock: duration=${detail.duration}, force=${detail.forceLock}`);
    try {
      // 销毁旧窗口
      if (await window.exists(lockWindowId).catch(() => false)) {
        await window.destroy(lockWindowId);
      }

      await window.create(lockWindowId, {
        title: '休息提醒',
        width: 1920,
        height: 1080,
        fullscreen: true,
        alwaysOnTop: true,
        resizable: false,
        center: false,
        url: `/lock.html?duration=${detail.duration}&forceLock=${detail.forceLock}`
      });
      // 隐藏主窗口
      await window.hide(mainWindowId);
    } catch (e) {
      console.error('[Window] Failed to create lock window:', e);
    }
  });

  // 锁屏关闭
  events.on('lock-complete', async () => {
    console.log('[IPC] lock-complete');
    await window.destroy(lockWindowId).catch(() => { });
    await window.show(mainWindowId);
    await window.setFocus(mainWindowId);
    // 通知停止声音
    await events.dispatch('stop-sound');
  });

  events.on('hide-lock', async () => {
    console.log('[IPC] hide-lock');
    await window.destroy(lockWindowId).catch(() => { });
    await window.show(mainWindowId);
    await events.dispatch('stop-sound');
  });

  // 开机自启（示例逻辑）
  events.on('set-auto-launch', async (data) => {
    const enable = data.detail?.enable;
    try {
      await os.setStartup({ name: 'HealthClock', enabled: enable });
      console.log(`[Main] Auto-launch set to: ${enable}`);
    } catch (e) { console.error('[Main] Auto-launch failed:', e); }
  });

  events.on('exit-app', async () => await app.exit());
}

async function main() {
  console.log('[Main] === HealthClock Starting ===');

  // Neutralino 必须初始化
  await Neutralino.init();

  setupEventHandlers();
  console.log('[Main] Event handlers registered');
  console.log('[Main] Ready');
}

main().catch(console.error);