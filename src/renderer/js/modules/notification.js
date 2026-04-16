// 通知模块
const NotificationModule = (function () {
    let isEnabled = true;
    let permissionGranted = false;

    async function init() {
        console.log('NotificationModule.init called');
        if (!('Notification' in window)) {
            console.log('Notifications not supported');
            return false;
        }
        if (Notification.permission === 'granted') {
            permissionGranted = true;
            console.log('Notification permission already granted');
            return true;
        }
        if (Notification.permission !== 'denied') {
            console.log('Requesting notification permission');
            const permission = await Notification.requestPermission();
            permissionGranted = permission === 'granted';
            console.log('Notification permission result:', permission);
        } else {
            console.log('Notification permission denied');
        }
        return permissionGranted;
    }

    // 非阻塞初始化 - 不等待用户响应
    function initWithoutWait() {
        console.log('NotificationModule.initWithoutWait called');
        if (!('Notification' in window)) {
            console.log('Notifications not supported');
            return false;
        }
        if (Notification.permission === 'granted') {
            permissionGranted = true;
            console.log('Notification permission already granted');
            return true;
        }
        if (Notification.permission !== 'denied') {
            console.log('Requesting notification permission (non-blocking)');
            Notification.requestPermission().then(permission => {
                permissionGranted = permission === 'granted';
                console.log('Notification permission result:', permission);
            }).catch(e => console.warn('Notification request error:', e));
        }
        return false;
    }

    function setEnabled(enabled) {
        isEnabled = enabled;
    }

    async function send(title, options = {}) {
        if (!isEnabled) return false;
        if (!permissionGranted) {
            if (Notification.permission === 'default') {
                await init();
            }
            if (!permissionGranted) return false;
        }
        try {
            const notification = new Notification(title, {
                icon: '',
                ...options
            });
            setTimeout(() => notification.close(), 5000);
            return true;
        } catch (e) {
            console.warn('Send notification error:', e);
            return false;
        }
    }

    function sendReminder() {
        return send('🧘 该活动啦！', {
            body: '站起来走走，伸个懒腰，活动一下筋骨吧！',
            tag: 'health-reminder',
            requireInteraction: true
        });
    }

    function sendTest() {
        return send('🔔 测试通知', {
            body: '如果你看到这条消息，说明桌面通知已开启！',
            tag: 'test-notification'
        });
    }

    return {
        init,
        initWithoutWait,
        setEnabled,
        send,
        sendReminder,
        sendTest
    };
})();