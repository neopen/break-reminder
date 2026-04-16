// src/renderer/js/modules/notification.js
const NotificationModule = (function () {
    let isEnabled = true;
    let permissionGranted = false;
    let _logger = typeof Logger !== 'undefined' ? Logger.createLogger('Notification') : console;

    // 检查是否在 Electron 环境中
    function isElectron() {
        return typeof window !== 'undefined' && !!window.require;
    }

    // 获取图标路径
    function getIconPath() {
        // 尝试多个可能的图标路径
        const iconPaths = [
            './icons/icon-64.png',
            './icons/icon-128.png',
            './icons/icon-256.png',
            './icon-64.png',
            './icon.png'
        ];
        
        // 返回第一个存在的图标，或者返回空字符串
        // 在实际使用中，可以使用默认图标
        return iconPaths[0];
    }

    async function init() {
        _logger.info('NotificationModule.init called');
        
        // 在 Electron 环境中，通过 IPC 请求权限
        if (isElectron()) {
            try {
                const { ipcRenderer } = window.require('electron');
                _logger.info('Requesting notification permission via IPC');
                const granted = ipcRenderer.sendSync('request-notification-permission');
                permissionGranted = granted;
                _logger.info('Notification permission via IPC:', granted);
                return granted;
            } catch (e) {
                _logger.error('Failed to request permission via IPC:', e);
                return false;
            }
        }
        
        // 浏览器环境
        if (!('Notification' in window)) {
            _logger.warn('Notifications not supported');
            return false;
        }
        
        if (Notification.permission === 'granted') {
            permissionGranted = true;
            _logger.info('Notification permission already granted');
            return true;
        }
        
        if (Notification.permission !== 'denied') {
            _logger.info('Requesting notification permission');
            try {
                const permission = await Notification.requestPermission();
                permissionGranted = permission === 'granted';
                _logger.info('Notification permission result:', permission);
            } catch (e) {
                _logger.error('Error requesting permission:', e);
            }
        } else {
            _logger.warn('Notification permission denied');
        }
        
        return permissionGranted;
    }

    // 非阻塞初始化
    function initWithoutWait() {
        _logger.info('NotificationModule.initWithoutWait called');
        
        // 在 Electron 环境中，通过 IPC 请求权限
        if (isElectron()) {
            try {
                const { ipcRenderer } = window.require('electron');
                ipcRenderer.send('request-notification-permission-async');
                // 监听权限结果
                ipcRenderer.once('notification-permission-result', (event, granted) => {
                    permissionGranted = granted;
                    _logger.info('Notification permission result (async):', granted);
                });
            } catch (e) {
                _logger.error('Failed to request permission via IPC:', e);
            }
            return;
        }
        
        // 浏览器环境
        if (!('Notification' in window)) {
            _logger.warn('Notifications not supported');
            return;
        }
        
        if (Notification.permission === 'granted') {
            permissionGranted = true;
            _logger.info('Notification permission already granted');
            return;
        }
        
        if (Notification.permission !== 'denied') {
            _logger.info('Requesting notification permission (non-blocking)');
            Notification.requestPermission().then(permission => {
                permissionGranted = permission === 'granted';
                _logger.info('Notification permission result:', permission);
            }).catch(e => _logger.error('Notification request error:', e));
        }
    }

    function setEnabled(enabled) {
        isEnabled = enabled;
        _logger.info('Notification enabled set to:', enabled);
    }
    
    function isNotificationEnabled() {
        return isEnabled && permissionGranted;
    }

    async function send(title, options = {}) {
        _logger.info('Sending notification:', title, options);
        
        if (!isEnabled) {
            _logger.info('Notifications disabled in settings');
            return false;
        }
        
        // 在 Electron 环境中，通过主进程发送通知
        if (isElectron()) {
            try {
                const { ipcRenderer } = window.require('electron');
                const result = ipcRenderer.sendSync('show-notification', {
                    title,
                    body: options.body || '',
                    icon: getIconPath(),
                    silent: false,
                    requireInteraction: options.requireInteraction || false,
                    tag: options.tag || 'health-reminder'
                });
                _logger.info('Notification sent via IPC, result:', result);
                return result;
            } catch (e) {
                _logger.error('Failed to send notification via IPC:', e);
                return false;
            }
        }
        
        // 浏览器环境
        if (!permissionGranted) {
            if (Notification.permission === 'default') {
                _logger.info('Requesting permission before sending');
                await init();
            }
            if (!permissionGranted) {
                _logger.warn('No notification permission');
                return false;
            }
        }
        
        try {
            const iconPath = getIconPath();
            const notification = new Notification(title, {
                icon: iconPath || undefined,  // 如果没有图标，不设置 icon 字段
                badge: iconPath || undefined,
                silent: false,
                requireInteraction: options.requireInteraction || false,
                tag: options.tag || 'health-reminder',
                body: options.body || '',
                ...options
            });
            
            notification.onclick = () => {
                _logger.info('Notification clicked');
                window.focus();
                notification.close();
            };
            
            notification.onerror = (e) => {
                _logger.error('Notification error:', e);
            };
            
            setTimeout(() => notification.close(), 8000);
            _logger.info('Browser notification sent successfully');
            return true;
        } catch (e) {
            _logger.error('Send notification error:', e);
            return false;
        }
    }

    async function sendReminder() {
        _logger.info('Sending reminder notification');
        return await send('🧘 该活动啦！', {
            body: '站起来走走，伸个懒腰，活动一下筋骨吧！',
            tag: 'health-reminder',
            requireInteraction: true
        });
    }

    async function sendTest() {
        _logger.info('Sending test notification');
        return await send('🔔 测试通知', {
            body: '如果你看到这条消息，说明桌面通知已开启！',
            tag: 'test-notification',
            requireInteraction: false
        });
    }

    return {
        init,
        initWithoutWait,
        setEnabled,
        isNotificationEnabled,
        send,
        sendReminder,
        sendTest
    };
})();

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationModule;
}

// 导出到全局
if (typeof window !== 'undefined') {
    window.NotificationModule = NotificationModule;
}