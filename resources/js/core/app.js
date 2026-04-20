/**
 * 应用主入口 (Renderer)
 * 职责：模块初始化协调、DOM 事件绑定、Neutralino 事件监听、状态同步
 * 架构：完全基于事件驱动，所有跨模块通信通过 Neutralino.events
 * 注意：日志统一使用 Logger.createLogger()
 */
(function () {
    const logger = typeof Logger !== 'undefined' ? Logger.createLogger('App') : console;
    logger.info('=== App Initialization Sequence Started ===');

    // 1. 收集核心 DOM 元素
    const elements = {
        startTime: document.getElementById('startTime'),
        endTime: document.getElementById('endTime'),
        intervalMinutes: document.getElementById('intervalMinutes'),
        lockMinutes: document.getElementById('lockMinutes'),
        forceLockToggle: document.getElementById('forceLockToggle'),
        soundToggle: document.getElementById('soundToggle'),
        desktopNotification: document.getElementById('desktopNotification'),
        lockNotification: document.getElementById('lockNotification'),
        lockSettingsTitle: document.getElementById('lockSettingsTitle'),
        lockSettingsContent: document.getElementById('lockSettingsContent'),
        startBtn: document.getElementById('startBtn'),
        stopBtn: document.getElementById('stopBtn'),
        statusBadge: document.getElementById('statusBadge'),
        nextReminderDiv: document.getElementById('nextReminder'),
        nextTimeText: document.getElementById('nextTimeText'),
        lockOverlay: document.getElementById('lockOverlay'),
        countdownSpan: document.getElementById('countdownSeconds'),
        unlockBtn: document.getElementById('unlockBtn'),
        timerRing: document.getElementById('timerRing'),
        intervalError: document.getElementById('intervalError'),
        lockError: document.getElementById('lockError'),
        todayCount: document.getElementById('todayCount'),
        continuousDays: document.getElementById('continuousDays'),
        weeklyRate: document.getElementById('weeklyRate'),
        resetStatsBtn: document.getElementById('resetStatsBtn'),
        testNotifyBtn: document.getElementById('testNotifyBtn')
    };

    // 2. 初始化各业务模块
    if (typeof Config !== 'undefined') Config.setElements(elements);
    if (typeof ReminderModule !== 'undefined') {
        ReminderModule.setElements({
            timerRing: elements.timerRing,
            countdownSpan: elements.countdownSpan,
            unlockBtn: elements.unlockBtn,
            lockOverlay: elements.lockOverlay
        });
        ReminderModule.setModules(Config, AudioModule);
    }
    if (typeof UIModule !== 'undefined') UIModule.setElements(elements);

    // 3. 设置提醒生命周期回调
    if (typeof ReminderModule !== 'undefined') {
        ReminderModule.setCallbacks({
            onReminderTrigger: async (notificationType) => {
                logger.info('Reminder triggered, type:', notificationType);
                if (typeof StatsModule !== 'undefined') await StatsModule.recordActivity();
                if (notificationType === 'desktop' && typeof NotificationModule !== 'undefined') {
                    await NotificationModule.sendReminder();
                }
            },
            onLockClose: async () => {
                logger.info('Lock closed, rescheduling next reminder');
                if (ReminderModule.isReminderRunning()) {
                    const now = new Date();
                    let config = {};
                    if (typeof Config !== 'undefined') {
                        if (typeof Config.getConfig === 'function') config = Config.getConfig();
                        else config = {
                            startTime: Config.get('startTime') || '08:00',
                            endTime: Config.get('endTime') || '18:00',
                            intervalMinutes: Config.get('intervalMinutes') || 40,
                            lockMinutes: Config.get('lockMinutes') || 5,
                            forceLock: Config.get('forceLock') || false,
                            soundEnabled: Config.get('soundEnabled') !== false,
                            notificationType: Config.get('notificationType') || 'desktop'
                        };
                    }
                    const next = ReminderModule.calculateNextReminder(now, config);
                    ReminderModule.setNextReminderTime(next.getTime());
                    if (typeof UIModule !== 'undefined') UIModule.updateNextReminderDisplay(next.getTime());
                    ReminderModule.startCheckLoop();
                }
                if (typeof AudioModule !== 'undefined') AudioModule.stopContinuous();
            }
        });
    }

    // 4. 音频模块状态绑定（锁屏时持续播放）
    if (typeof AudioModule !== 'undefined' && typeof ReminderModule !== 'undefined') {
        AudioModule.setLockedGetter(() => ReminderModule.isCurrentlyLocked());
    }

    // 5. 初始化 UI 控制器与免打扰模块
    if (typeof UIController !== 'undefined') UIController.init(elements);
    if (typeof DNDController !== 'undefined') DNDController.init();

    // 6. 绑定顶部按钮事件
    elements.startBtn?.addEventListener('click', () => typeof AlarmController !== 'undefined' && AlarmController.start());
    elements.stopBtn?.addEventListener('click', () => typeof AlarmController !== 'undefined' && AlarmController.stop());
    elements.unlockBtn?.addEventListener('click', () => typeof LockController !== 'undefined' && LockController.unlock());
    elements.resetStatsBtn?.addEventListener('click', () => typeof StatsController !== 'undefined' && StatsController.reset());
    elements.testNotifyBtn?.addEventListener('click', () => typeof NotificationTester !== 'undefined' && NotificationTester.test());

    // 7. 异步初始化核心数据流
    (async () => {
        try {
            if (typeof Config !== 'undefined') {
                await Config.load();
                if (typeof UIController !== 'undefined') {
                    UIController.toggleLockSettings(Config.get('notificationType'));
                    UIController.fixValues();
                }
            }
            if (typeof StatsModule !== 'undefined') {
                await StatsModule.load();
                StatsModule.fixContinuousDays();
                if (typeof UIModule !== 'undefined') {
                    UIModule.initStatsSubscription();
                    UIModule.updateStatsDisplay(StatsModule.getSummary());
                }
            }
            if (typeof UIModule !== 'undefined') UIModule.updateUI(false);
            if (typeof ReminderModule !== 'undefined') ReminderModule.closeLockScreen();
            if (typeof NotificationModule !== 'undefined') NotificationModule.initWithoutWait();
            logger.info('App initialization completed successfully.');
        } catch (err) {
            logger.error('Critical error during app initialization:', err);
        }
    })();

    /**
     * 8. 注册 Neutralino 全局事件监听
     * 事件驱动架构核心：所有跨窗口通信通过此处统一处理
     */
    if (typeof Neutralino !== 'undefined') {
        /**
         * 事件：stop-sound
         * 来源：锁屏窗口关闭时发送
         * 职责：停止声音、恢复主窗口、重置锁屏状态、调度下一次提醒
         */
        /**
         * 事件：stop-sound
         * 来源：锁屏窗口关闭时发送
         */
        Neutralino.events.on('stop-sound', (event) => {
            logger.info('[Event] stop-sound received via broadcast');
            logger.info('[Event] Event data:', event.detail);

            // 停止声音
            if (typeof AudioModule !== 'undefined') {
                AudioModule.stopContinuous();
            }

            // 恢复主窗口
            Neutralino.window.show();
            Neutralino.window.focus();

            // 重置状态
            if (typeof ReminderModule !== 'undefined') {
                ReminderModule.resetLockStates();
            }
        });

        /**
         * 事件：hide-lock
         * 来源：手动停止闹铃或强制关闭锁屏时
         * 职责：与 stop-sound 类似，但用于非正常关闭场景
         */
        Neutralino.events.on('hide-lock', async () => {
            logger.info('[Event] hide-lock received');
            // 直接复用 stop-sound 的处理逻辑
            if (typeof AudioModule !== 'undefined') AudioModule.stopContinuous();
            if (typeof ReminderModule !== 'undefined') ReminderModule.resetLockStates();
            try {
                await Neutralino.window.show();
                await Neutralino.window.focus();
            } catch (e) {
                logger.error('[Event] Failed to restore main window:', e);
            }
        });
    }

    // 9. 页面关闭保护（防止提醒运行中误关闭）
    window.addEventListener('beforeunload', (e) => {
        if (typeof ReminderModule !== 'undefined' && ReminderModule.isReminderRunning()) {
            e.preventDefault();
            e.returnValue = 'Reminder is running. Are you sure you want to leave?';
        }
    });

    // ========== 锁屏状态轮询（Storage 方案） ==========
    let lockPollingInterval = null;
    let lastCheckTime = Date.now();

    function startLockPolling() {
        if (lockPollingInterval) clearInterval(lockPollingInterval);

        logger.info('[Polling] Starting lock status polling...');

        lockPollingInterval = setInterval(async () => {
            try {
                const lockClosed = await Neutralino.storage.getData('lock_closed');

                // 添加调试日志
                if (lockClosed) {
                    logger.info('[Polling] Storage value:', lockClosed);
                }

                if (lockClosed === 'true' || lockClosed === true || lockClosed === '"true"') {
                    logger.info('[Polling] ========== LOCK CLOSED DETECTED ==========');
                    logger.info('[Polling] Raw value:', lockClosed);

                    // 清除标志
                    await Neutralino.storage.setData('lock_closed', 'false');

                    // 停止声音
                    if (typeof AudioModule !== 'undefined') {
                        AudioModule.stopContinuous();
                        logger.info('[Polling] Audio stopped');
                    }

                    // 重置锁屏状态
                    if (typeof ReminderModule !== 'undefined') {
                        ReminderModule.resetLockStates();
                        logger.info('[Polling] Lock states reset');
                    }

                    // 恢复主窗口
                    try {
                        await Neutralino.window.show();
                        await Neutralino.window.focus();
                        logger.info('[Polling] Main window restored');
                    } catch (e) {
                        logger.error('[Polling] Failed to restore window:', e);
                    }

                    // 重新调度提醒
                    if (typeof ReminderModule !== 'undefined' && ReminderModule.isReminderRunning()) {
                        const callbacks = ReminderModule.getCallbacks();
                        if (callbacks && callbacks.onLockClose) {
                            await callbacks.onLockClose();
                            logger.info('[Polling] Next reminder scheduled');
                        }
                    }
                }
            } catch (e) {
                logger.error('[Polling] Error:', e.message);
            }
        }, 500);
    }

    // 启动轮询
    startLockPolling();
})();