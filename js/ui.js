// UI 更新模块
const UIModule = (function () {
    let elements = {};
    let statsUnsubscribe = null;

    function setElements(e) {
        elements = e;
    }

    function updateUI(isRunning) {
        if (isRunning) {
            if (elements.statusBadge) {
                elements.statusBadge.innerHTML = '🟢 闹铃运行中 · 将在时间段内自动提醒';
                elements.statusBadge.className = 'status-badge status-active';
            }
            if (elements.startBtn) {
                elements.startBtn.disabled = true;
                elements.startBtn.style.opacity = '0.6';
            }
            if (elements.stopBtn) {
                elements.stopBtn.style.background = '#ef4444';
            }
        } else {
            if (elements.statusBadge) {
                elements.statusBadge.innerHTML = '⚪ 闹铃未启动';
                elements.statusBadge.className = 'status-badge status-inactive';
            }
            if (elements.startBtn) {
                elements.startBtn.disabled = false;
                elements.startBtn.style.opacity = '1';
            }
            if (elements.stopBtn) {
                elements.stopBtn.style.background = '#ef4444';
            }
        }
    }

    function updateNextReminderDisplay(timestamp) {
        if (!timestamp || !elements.nextReminderDiv) {
            if (elements.nextReminderDiv) elements.nextReminderDiv.classList.add('hidden');
            return;
        }
        const date = new Date(timestamp);
        const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
        if (elements.nextTimeText) elements.nextTimeText.innerText = timeStr;
        if (elements.nextReminderDiv) elements.nextReminderDiv.classList.remove('hidden');
    }

    function updateStatsDisplay(stats) {
        if (elements.todayCount) elements.todayCount.innerText = stats.todayCount;
        if (elements.continuousDays) elements.continuousDays.innerText = stats.continuousDays;
        if (elements.weeklyRate) {
            const rate = StatsModule.getWeeklyRate();
            elements.weeklyRate.innerText = `${rate}%`;
        }
    }

    function showError(elementId, message, isError = true) {
        const errorEl = elements[elementId];
        const inputEl = elements[elementId === 'intervalError' ? 'intervalMinutes' : 'lockMinutes'];
        if (errorEl) {
            if (isError) {
                errorEl.textContent = message;
                errorEl.classList.remove('hidden');
                if (inputEl) inputEl.classList.add('input-error');
            } else {
                errorEl.classList.add('hidden');
                if (inputEl) inputEl.classList.remove('input-error');
            }
        }
    }

    function initStatsSubscription() {
        if (statsUnsubscribe) statsUnsubscribe();
        statsUnsubscribe = StatsModule.subscribe((stats) => {
            updateStatsDisplay(stats);
        });
        updateStatsDisplay(StatsModule.load());
    }

    return {
        setElements,
        updateUI,
        updateNextReminderDisplay,
        updateStatsDisplay,
        showError,
        initStatsSubscription
    };
})();