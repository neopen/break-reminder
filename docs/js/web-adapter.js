// Web 适配层 - 模拟 Electron 环境并修复锁屏功能
(function() {
    console.log('[Web Adapter] Initializing...');
    
    // 存储锁屏窗口引用
    var _lockWindow = null;
    var _soundInterval = null;
    var _audioContext = null;
    
    // ========== 停止声音 ==========
    function stopSound() {
        if (_soundInterval) {
            clearInterval(_soundInterval);
            _soundInterval = null;
        }
        if (_audioContext) {
            _audioContext.close();
            _audioContext = null;
        }
        console.log('[Web Adapter] Sound stopped');
    }
    
    // ========== 播放声音 ==========
    function playBeep() {
        try {
            var AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!_audioContext) {
                _audioContext = new AudioContext();
            }
            if (_audioContext.state === 'suspended') {
                _audioContext.resume();
            }
            var osc = _audioContext.createOscillator();
            var gain = _audioContext.createGain();
            osc.connect(gain);
            gain.connect(_audioContext.destination);
            osc.frequency.value = 880;
            gain.gain.setValueAtTime(0.3, _audioContext.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, _audioContext.currentTime + 0.3);
            osc.start();
            osc.stop(_audioContext.currentTime + 0.3);
        } catch(e) {
            console.warn('[Web Adapter] Sound failed:', e);
        }
    }
    
    // ========== 注意：不模拟 require，让代码走 Web 分支 ==========
    // 但是需要保留 ipcRenderer 等功能供其他模块使用
    window._webIPC = {
        send: function(channel, ...args) {
            console.log('[Web Adapter] IPC send:', channel, args);
            if (channel === 'show-lock') {
                var duration = args[0] || 60;
                var forceLock = args[1] || false;
                var url = 'lock.html?duration=' + duration + '&forceLock=' + forceLock;
                _lockWindow = window.open(url, '_blank', 'width=' + screen.width + ',height=' + screen.height + ',top=0,left=0');
            }
            if (channel === 'hide-lock') {
                if (_lockWindow && !_lockWindow.closed) {
                    _lockWindow.close();
                }
                _lockWindow = null;
                stopSound();
            }
            if (channel === 'stop-sound-request') {
                stopSound();
            }
        },
        sendSync: function() { return null; },
        on: function(channel, callback) {
            if (!window._ipcCallbacks) window._ipcCallbacks = {};
            if (!window._ipcCallbacks[channel]) window._ipcCallbacks[channel] = [];
            window._ipcCallbacks[channel].push(callback);
        }
    };
    
    // ========== 触发 IPC 回调 ==========
    window.triggerIPC = function(channel, ...args) {
        console.log('[Web Adapter] triggerIPC:', channel);
        if (window._ipcCallbacks && window._ipcCallbacks[channel]) {
            window._ipcCallbacks[channel].forEach(function(cb) {
                try { cb(null, ...args); } catch(e) {}
            });
        }
        if (channel === 'lock-closed' || channel === 'stop-sound') {
            stopSound();
            _lockWindow = null;
        }
    };
    
    // ========== 模拟文件系统模块 ==========
    window.FileSystemManager = window.FileSystemManager || {
        init: function() { return false; },
        isUsingLocalFile: function() { return false; },
        getFileSystemUtil: function() { return null; },
        buildFilePath: function() { return null; },
        getDataPath: function() { return null; }
    };
    
    window.FileSystemUtil = window.FileSystemUtil || {
        init: function() { return false; },
        getRootPath: function() { return null; },
        ensureDir: function() { return false; },
        readFile: function() { return null; },
        writeFile: function() { return false; }
    };
    
    // ========== 模拟 AudioModule ==========
    if (!window.AudioModule) {
        window.AudioModule = {
            setEnabled: function() {},
            setLockedGetter: function() {},
            playAlert: function() { playBeep(); },
            startContinuous: function() {
                stopSound();
                playBeep();
                _soundInterval = setInterval(function() {
                    playBeep();
                }, 3000);
                console.log('[Web Adapter] Continuous sound started');
            },
            stopContinuous: function() { 
                stopSound(); 
                console.log('[Web Adapter] Continuous sound stopped');
            },
            resume: function() { return Promise.resolve(); }
        };
    }
    
    // ========== 模拟 NotificationModule ==========
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
    
    // ========== 修复 ReminderModule ==========
    var fixReminder = function() {
        if (!window.ReminderModule) return false;
        
        console.log('[Web Adapter] Fixing ReminderModule for Web...');
        
        // 保存原始方法
        var originalShowLockScreen = window.ReminderModule.showLockScreen;
        var originalCloseLockScreen = window.ReminderModule.closeLockScreen;
        
        // 重写 showLockScreen - 使用 window.open 而不是 IPC
        window.ReminderModule.showLockScreen = function(minutes, forceLock, onComplete) {
            console.log('[Web Adapter] showLockScreen:', minutes, 'minutes, forceLock:', forceLock);
            
            var totalSeconds = minutes * 60;
            var url = 'lock.html?duration=' + totalSeconds + '&forceLock=' + forceLock;
            
            console.log('[Web Adapter] Opening lock window:', url);
            _lockWindow = window.open(url, '_blank', 'width=' + screen.width + ',height=' + screen.height + ',top=0,left=0');
            
            // 监听窗口关闭
            var checkClosed = setInterval(function() {
                if (_lockWindow && _lockWindow.closed) {
                    clearInterval(checkClosed);
                    console.log('[Web Adapter] Lock window closed by user');
                    stopSound();
                    window.triggerIPC('lock-closed');
                    if (onComplete) onComplete();
                    _lockWindow = null;
                }
            }, 500);
        };
        
        // 重写 closeLockScreen
        window.ReminderModule.closeLockScreen = function() {
            console.log('[Web Adapter] closeLockScreen');
            if (_lockWindow && !_lockWindow.closed) {
                _lockWindow.close();
            }
            _lockWindow = null;
            stopSound();
        };
        
        // 重写 isCurrentlyLocked
        window.ReminderModule.isCurrentlyLocked = function() {
            return _lockWindow && !_lockWindow.closed;
        };
        
        return true;
    };
    
    // 等待 ReminderModule 加载
    if (window.ReminderModule) {
        fixReminder();
    } else {
        var checkCount = 0;
        var checkInterval = setInterval(function() {
            checkCount++;
            if (window.ReminderModule) {
                fixReminder();
                clearInterval(checkInterval);
            } else if (checkCount > 50) {
                clearInterval(checkInterval);
            }
        }, 100);
    }
    
    // ========== 确保 Config 有 updateNotificationHint ==========
    if (window.Config && !window.Config.updateNotificationHint) {
        window.Config.updateNotificationHint = function(type) {
            var hintEl = document.getElementById('notificationHint');
            if (hintEl) {
                hintEl.innerHTML = type === 'desktop' 
                    ? '💡 桌面通知：仅弹窗提醒，不锁屏' 
                    : '💡 锁屏通知：全屏锁屏，强制休息';
            }
        };
    }
    
    // ========== 禁用 Service Worker ==========
    if ('serviceWorker' in navigator) {
        var originalRegister = navigator.serviceWorker.register;
        navigator.serviceWorker.register = function() {
            console.log('[Web Adapter] Service Worker disabled');
            return Promise.reject(new Error('Service Worker disabled'));
        };
    }
    
    // ========== 全局错误处理 ==========
    window.addEventListener('error', function(e) {
        if (e.message && e.message.includes('require')) {
            console.warn('[Web Adapter] Caught require error:', e.message);
            e.preventDefault();
            return true;
        }
    });
    
    console.log('[Web Adapter] Initialized for Web');
})();