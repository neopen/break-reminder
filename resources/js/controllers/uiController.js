/**
 * UI 控制器 (UIController)
 * 功能：处理用户交互、表单验证、DOM 更新与事件绑定
 * 兼容：Neutralino / 浏览器
 * 架构：事件驱动 - 配置变更后通过事件通知其他模块
 */
const UIController = (function () {
    const logger = typeof Logger !== 'undefined' ? Logger.createLogger('UIController') : console;
    let _elements = {};
    let _isInitialized = false;

    /**
     * 切换锁屏设置区域的显示/隐藏状态
     * @param {string} notificationType - 'desktop' 或 'lock'
     */
    function toggleLockSettings(notificationType) {
        const titleEl = _elements.lockSettingsTitle;
        const contentEl = _elements.lockSettingsContent;
        if (titleEl && contentEl) {
            const isVisible = notificationType === 'lock';
            titleEl.style.display = isVisible ? 'block' : 'none';
            contentEl.style.display = isVisible ? 'block' : 'none';
            logger.info('Lock settings visibility set to:', isVisible);
        }
    }

    /**
     * 校验输入值并显示错误提示
     * @returns {boolean} 校验是否通过
     */
    function validateAndShowErrors() {
        let isValid = true;
        const intervalValue = _elements.intervalMinutes?.value || 40;
        const intervalMin = parseInt(_elements.intervalMinutes?.min) || 10;
        const intervalMax = parseInt(_elements.intervalMinutes?.max) || 300;
        const lockValue = _elements.lockMinutes?.value || 5;
        const lockMin = parseInt(_elements.lockMinutes?.min) || 1;
        const lockMax = parseInt(_elements.lockMinutes?.max) || 30;

        if (typeof Config !== 'undefined' && Config.validateInterval) {
            if (!Config.validateInterval(intervalValue, intervalMin, intervalMax)) {
                if (typeof UIModule !== 'undefined') UIModule.showError('intervalError', '提醒频率范围：10 ~ 300 分钟', true);
                isValid = false;
            } else {
                if (typeof UIModule !== 'undefined') UIModule.showError('intervalError', '', false);
            }
        }

        if (typeof Config !== 'undefined' && Config.validateLockMinutes) {
            if (!Config.validateLockMinutes(lockValue, lockMin, lockMax)) {
                if (typeof UIModule !== 'undefined') UIModule.showError('lockError', '锁屏时长范围：1 ~ 30 分钟', true);
                isValid = false;
            } else {
                if (typeof UIModule !== 'undefined') UIModule.showError('lockError', '', false);
            }
        }
        return isValid;
    }

    /**
     * 修正输入框中的非法值（越界/非整数）
     */
    function fixValues() {
        const intervalValue = _elements.intervalMinutes?.value || 40;
        const intervalMin = parseInt(_elements.intervalMinutes?.min) || 10;
        const intervalMax = parseInt(_elements.intervalMinutes?.max) || 300;
        const intervalStep = parseInt(_elements.intervalMinutes?.step) || 5;
        const lockValue = _elements.lockMinutes?.value || 5;
        const lockMin = parseInt(_elements.lockMinutes?.min) || 1;
        const lockMax = parseInt(_elements.lockMinutes?.max) || 30;

        if (typeof Config !== 'undefined') {
            const fixedInterval = Config.fixIntervalValue(intervalValue, intervalMin, intervalMax, intervalStep);
            const fixedLock = Config.fixLockValue(lockValue, lockMin, lockMax);
            if (_elements.intervalMinutes) _elements.intervalMinutes.value = fixedInterval;
            if (_elements.lockMinutes) _elements.lockMinutes.value = fixedLock;
        }
        validateAndShowErrors();
    }

    /**
     * 配置变更后重新计算下次提醒时间
     * 通过事件系统通知提醒模块
     */
    function updateNextReminderAfterConfigChange() {
        if (typeof ReminderModule === 'undefined' || !ReminderModule.isReminderRunning()) return;

        const cachedConfig = typeof Config !== 'undefined' ? (Config.get('_config') || Config.get('config')) : {};
        if (!cachedConfig) return;

        const now = new Date();
        const next = ReminderModule.calculateNextReminder(now, cachedConfig);
        ReminderModule.setNextReminderTime(next.getTime());
        if (typeof UIModule !== 'undefined') UIModule.updateNextReminderDisplay(next.getTime());
        logger.info('Next reminder recalculated:', next.toLocaleTimeString());
    }

    /**
     * 绑定所有 UI 交互事件
     */
    function bindEvents() {
        // 提醒间隔输入框失焦校验
        _elements.intervalMinutes?.addEventListener('blur', () => {
            fixValues();
            updateNextReminderAfterConfigChange();
        });

        // 锁屏时长输入框失焦校验
        _elements.lockMinutes?.addEventListener('blur', fixValues);

        // 时间段设置变更
        _elements.startTime?.addEventListener('change', async () => {
            if (typeof Config !== 'undefined') await Config.save();
            updateNextReminderAfterConfigChange();
        });
        _elements.endTime?.addEventListener('change', async () => {
            if (typeof Config !== 'undefined') await Config.save();
            updateNextReminderAfterConfigChange();
        });

        // 声音开关变更
        _elements.soundToggle?.addEventListener('change', async () => {
            if (typeof Config !== 'undefined') await Config.save();
            if (typeof AudioModule !== 'undefined') {
                AudioModule.setEnabled(_elements.soundToggle.checked);
                logger.info('Sound module enabled state updated:', _elements.soundToggle.checked);
            }
        });

        // 强制锁屏开关变更
        _elements.forceLockToggle?.addEventListener('change', async () => {
            if (typeof Config !== 'undefined') await Config.save();
        });

        // 通知类型切换
        if (_elements.desktopNotification && _elements.lockNotification) {
            _elements.desktopNotification.addEventListener('change', async (e) => {
                if (e.target.checked && typeof Config !== 'undefined') {
                    Config.updateNotificationHint('desktop');
                    toggleLockSettings('desktop');
                    await Config.save();
                }
            });

            _elements.lockNotification.addEventListener('change', async (e) => {
                if (e.target.checked && typeof Config !== 'undefined') {
                    Config.updateNotificationHint('lock');
                    toggleLockSettings('lock');
                    await Config.save();
                }
            });
        }

        // 开机自启动开关
        const autoLaunchToggle = document.getElementById('autoLaunchToggle');
        if (autoLaunchToggle) {
            // 初始化状态
            (async () => {
                if (typeof AutoLaunchModule !== 'undefined') {
                    const status = await AutoLaunchModule.getStatus();
                    autoLaunchToggle.checked = status;
                }
            })();

            autoLaunchToggle.addEventListener('change', async () => {
                if (typeof AutoLaunchModule !== 'undefined') {
                    await AutoLaunchModule.setEnabled(autoLaunchToggle.checked);
                }
            });
        }

        logger.info('UI event binding completed');
    }

    /**
     * 初始化控制器入口
     * @param {Object} elements - DOM 元素集合
     */
    function init(elements) {
        if (_isInitialized) {
            logger.warn('UIController already initialized');
            return;
        }
        _elements = elements;
        // 挂载到全局供 config.js 调用
        window.toggleLockSettings = toggleLockSettings;
        bindEvents();
        _isInitialized = true;
        logger.info('UIController initialized');
    }

    return {
        init,
        toggleLockSettings,
        validateAndShowErrors,
        fixValues,
        updateNextReminderAfterConfigChange
    };
})();

// UMD 导出
if (typeof module !== 'undefined' && module.exports) module.exports = UIController;
if (typeof window !== 'undefined') window.UIController = UIController;