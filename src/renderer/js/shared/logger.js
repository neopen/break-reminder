// 日志系统
const Logger = (function () {
    const LOG_LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
    let currentLevel = LOG_LEVELS.INFO;

    // 检查是否在开发环境（兼容 Neutralino/Electron/浏览器）
    function isDevelopment() {
        try {
            return typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development';
        } catch (e) {
            // Neutralino 渲染进程为纯浏览器环境，无 process 对象，回退到本地协议或 localhost 判断
            return typeof window !== 'undefined' && (
                window.location.protocol === 'file:' ||
                window.location.hostname === 'localhost' ||
                window.location.hostname === '127.0.0.1'
            );
        }
    }

    // 初始化日志级别
    function init() {
        if (isDevelopment()) {
            currentLevel = LOG_LEVELS.DEBUG;
        }
    }

    // 安全地序列化任意值（特别是错误对象，防止循环引用报错）
    function safeStringify(value) {
        if (value === null) return 'null';
        if (value === undefined) return 'undefined';

        if (value instanceof Error) {
            return JSON.stringify({
                name: value.name,
                message: value.message,
                stack: value.stack
            }, null, 2);
        }

        if (typeof value === 'object') {
            try {
                return JSON.stringify(value, (key, val) => {
                    if (typeof val === 'object' && val !== null) {
                        if (val instanceof Error) {
                            return { name: val.name, message: val.message, stack: val.stack };
                        }
                    }
                    return val;
                }, 2);
            } catch (e) {
                return '[Unable to stringify]';
            }
        }

        return String(value);
    }

    // 格式化日志消息
    function formatMessage(moduleName, level, message, args) {
        const timestamp = new Date().toISOString();
        const levelStr = Object.keys(LOG_LEVELS).find(key => LOG_LEVELS[key] === level) || 'UNKNOWN';
        const moduleStr = moduleName ? `[${moduleName}]` : '';
        const messageStr = typeof message === 'string' ? message : safeStringify(message);

        let argsStr = '';
        if (args.length > 0) {
            argsStr = ' ' + args.map(arg => {
                return typeof arg === 'object' ? safeStringify(arg) : String(arg);
            }).join(' ');
        }

        return `${timestamp} ${levelStr} ${moduleStr} ${messageStr}${argsStr}`;
    }

    // 统一日志输出核心
    function log(level, moduleName, message, ...args) {
        if (level < currentLevel) return;
        const formatted = formatMessage(moduleName, level, message, args);
        const consoleMethod = level === LOG_LEVELS.ERROR ? 'error' : level === LOG_LEVELS.WARN ? 'warn' : 'log';
        console[consoleMethod](formatted);
    }

    // 创建模块日志实例
    function createLogger(moduleName) {
        return {
            debug: (message, ...args) => log(LOG_LEVELS.DEBUG, moduleName, message, ...args),
            info: (message, ...args) => log(LOG_LEVELS.INFO, moduleName, message, ...args),
            warn: (message, ...args) => log(LOG_LEVELS.WARN, moduleName, message, ...args),
            error: (message, ...args) => log(LOG_LEVELS.ERROR, moduleName, message, ...args)
        };
    }

    init();
    return { createLogger };
})();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Logger;
}
if (typeof window !== 'undefined') {
    window.Logger = Logger;
}