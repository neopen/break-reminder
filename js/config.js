// 配置管理模块
const Config = (function () {
    let _config = null;
    let _elements = {};
    let _listeners = [];

    function setElements(elements) {
        _elements = elements;
    }

    function load() {
        const saved = localStorage.getItem('healthAlarmConfig');
        const defaults = {
            startTime: '08:00',
            endTime: '18:00',
            intervalMinutes: 40,
            lockMinutes: 5,
            forceLock: false,
            soundEnabled: true,
            notificationEnabled: true
        };

        if (saved) {
            try {
                _config = { ...defaults, ...JSON.parse(saved) };
            } catch (e) {
                _config = { ...defaults };
            }
        } else {
            _config = { ...defaults };
        }

        // 同步到DOM
        if (_elements.startTime) _elements.startTime.value = _config.startTime;
        if (_elements.endTime) _elements.endTime.value = _config.endTime;
        if (_elements.intervalMinutes) _elements.intervalMinutes.value = _config.intervalMinutes;
        if (_elements.lockMinutes) _elements.lockMinutes.value = _config.lockMinutes;
        if (_elements.forceLockToggle) _elements.forceLockToggle.checked = _config.forceLock;
        if (_elements.soundToggle) _elements.soundToggle.checked = _config.soundEnabled;
        if (_elements.notificationToggle) _elements.notificationToggle.checked = _config.notificationEnabled;

        console.log('Config loaded:', _config);
        return { ..._config };
    }

    function save() {
        if (!_config) {
            _config = {};
        }

        if (_elements.startTime) _config.startTime = _elements.startTime.value;
        if (_elements.endTime) _config.endTime = _elements.endTime.value;
        if (_elements.intervalMinutes) _config.intervalMinutes = parseInt(_elements.intervalMinutes.value);
        if (_elements.lockMinutes) _config.lockMinutes = parseInt(_elements.lockMinutes.value);
        if (_elements.forceLockToggle) _config.forceLock = _elements.forceLockToggle.checked;
        if (_elements.soundToggle) _config.soundEnabled = _elements.soundToggle.checked;
        if (_elements.notificationToggle) _config.notificationEnabled = _elements.notificationToggle.checked;

        localStorage.setItem('healthAlarmConfig', JSON.stringify(_config));
        console.log('Config saved:', _config);

        // 通知监听器
        _listeners.forEach(fn => fn({ ..._config }));

        return { ..._config };
    }

    function get(key) {
        return _config ? _config[key] : null;
    }

    function set(key, value) {
        if (_config) {
            _config[key] = value;
            save();
        }
    }

    function subscribe(listener) {
        _listeners.push(listener);
        return () => {
            _listeners = _listeners.filter(l => l !== listener);
        };
    }

    function validateInterval(value) {
        const num = parseInt(value);
        return !isNaN(num) && num >= 10 && num <= 300;
    }

    function validateLockMinutes(value) {
        const num = parseInt(value);
        return !isNaN(num) && num >= 1 && num <= 30;
    }

    function fixIntervalValue(value) {
        let num = parseInt(value);
        if (isNaN(num)) return 40;
        if (num < 10) return 10;
        if (num > 300) return 300;
        return Math.round(num / 10) * 10;
    }

    function fixLockValue(value) {
        let num = parseInt(value);
        if (isNaN(num)) return 5;
        if (num < 1) return 1;
        if (num > 30) return 30;
        return num;
    }

    return {
        setElements,
        load,
        save,
        get,
        set,
        subscribe,
        validateInterval,
        validateLockMinutes,
        fixIntervalValue,
        fixLockValue
    };
})();