// 统计打卡模块
const StatsModule = (function () {
    let _stats = null;
    let _listeners = [];
    let _useLocalFile = false;
    let _fs = null;
    let _dataPath = '';

    function initFileSystem() {
        if (typeof window !== 'undefined' && window.pake) {
            _useLocalFile = true;
            _dataPath = './user-data/';
            return true;
        }
        if (typeof process !== 'undefined' && process.versions && process.versions.electron) {
            try {
                _fs = require('fs');
                const path = require('path');
                const appDataPath = process.env.APPDATA || process.env.HOME;
                _dataPath = path.join(appDataPath, 'stand-up-alarm');
                if (!_fs.existsSync(_dataPath)) {
                    _fs.mkdirSync(_dataPath, { recursive: true });
                }
                _useLocalFile = true;
                return true;
            } catch (e) { }
        }
        return false;
    }

    function loadFromFile() {
        if (!_useLocalFile || !_fs) return null;
        try {
            const filePath = _dataPath + 'stats.json';
            if (_fs.existsSync(filePath)) {
                return JSON.parse(_fs.readFileSync(filePath, 'utf8'));
            }
        } catch (e) { }
        return null;
    }

    function saveToFile(data) {
        if (!_useLocalFile || !_fs) return false;
        try {
            _fs.writeFileSync(_dataPath + 'stats.json', JSON.stringify(data, null, 2), 'utf8');
            return true;
        } catch (e) { }
        return false;
    }

    function load() {
        initFileSystem();

        const saved = _useLocalFile ? loadFromFile() : localStorage.getItem('healthAlarmStats');
        const today = getTodayStr();

        if (saved) {
            try {
                _stats = typeof saved === 'string' ? JSON.parse(saved) : saved;
            } catch (e) {
                _stats = { todayCount: 0, lastActivityDate: null, continuousDays: 0, weeklyRecords: {} };
            }
        } else {
            _stats = { todayCount: 0, lastActivityDate: null, continuousDays: 0, weeklyRecords: {} };
        }

        // 检查是否需要重置今日计数
        if (_stats.lastActivityDate !== today) {
            if (_stats.lastActivityDate && isConsecutive(_stats.lastActivityDate, today)) {
                _stats.continuousDays++;
            } else if (_stats.lastActivityDate && _stats.lastActivityDate !== today) {
                _stats.continuousDays = 1;
            } else if (!_stats.lastActivityDate) {
                _stats.continuousDays = 1;
            }
            _stats.todayCount = 0;
            _stats.lastActivityDate = today;
            save();
        }

        return { ..._stats };
    }

    function save() {
        localStorage.setItem('healthAlarmStats', JSON.stringify(_stats));
        if (_useLocalFile) {
            saveToFile(_stats);
        }
        _listeners.forEach(fn => fn({ ..._stats }));
    }

    function getTodayStr() {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }

    function isConsecutive(lastDate, today) {
        const last = new Date(lastDate);
        const current = new Date(today);
        const diff = (current - last) / (1000 * 60 * 60 * 24);
        return diff === 1;
    }

    function getWeekStr(date) {
        const d = new Date(date);
        const year = d.getFullYear();
        const week = Math.ceil(((d - new Date(year, 0, 1)) / 86400000 + 1) / 7);
        return `${year}-W${week}`;
    }

    function recordActivity() {
        const today = getTodayStr();
        const week = getWeekStr(today);

        if (_stats.lastActivityDate === today) {
            _stats.todayCount++;
        } else {
            if (_stats.lastActivityDate && isConsecutive(_stats.lastActivityDate, today)) {
                _stats.continuousDays++;
            } else if (_stats.lastActivityDate && _stats.lastActivityDate !== today) {
                _stats.continuousDays = 1;
            } else if (!_stats.lastActivityDate) {
                _stats.continuousDays = 1;
            }
            _stats.todayCount = 1;
        }

        _stats.lastActivityDate = today;

        if (!_stats.weeklyRecords[week]) {
            _stats.weeklyRecords[week] = 0;
        }
        _stats.weeklyRecords[week]++;

        save();
        return { ..._stats };
    }

    function getWeeklyRate() {
        const today = getTodayStr();
        const week = getWeekStr(today);
        const currentCount = _stats.weeklyRecords[week] || 0;

        const now = new Date();
        const dayOfWeek = now.getDay() || 7;
        const daysPassed = dayOfWeek;
        const targetPerDay = 3;
        const totalTarget = daysPassed * targetPerDay;

        if (totalTarget === 0) return 0;
        return Math.min(100, Math.round((currentCount / totalTarget) * 100));
    }

    function resetToday() {
        _stats.todayCount = 0;
        save();
    }

    function subscribe(listener) {
        _listeners.push(listener);
        return () => {
            _listeners = _listeners.filter(l => l !== listener);
        };
    }

    return {
        load,
        recordActivity,
        getWeeklyRate,
        resetToday,
        subscribe,
        getTodayStr
    };
})();