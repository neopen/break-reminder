const { net } = require('electron');
const { app } = require('electron');

function compareVersions(current, latest) {
    const currentParts = current.replace(/^v/, '').split('.').map(Number);
    const latestParts = latest.replace(/^v/, '').split('.').map(Number);

    for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
        const a = currentParts[i] || 0;
        const b = latestParts[i] || 0;
        if (a < b) return -1;
        if (a > b) return 1;
    }
    return 0;
}

function checkForUpdate() {
    return new Promise((resolve) => {
        const currentVersion = app.getVersion();
        console.log('[UpdateChecker] Current version:', currentVersion);

        let settled = false;
        let timer = null;

        const finish = (result) => {
            if (settled) return;
            settled = true;
            if (timer) {
                clearTimeout(timer);
                timer = null;
            }
            resolve(result);
        };

        const fail = (message) => finish({
            hasUpdate: false,
            currentVersion,
            latestVersion: null,
            releaseUrl: null,
            releaseNotes: null,
            error: message
        });

        const request = net.request({
            method: 'GET',
            url: 'https://api.github.com/repos/neopen/active-break-clock/releases/latest',
            headers: {
                'User-Agent': 'HealthClock-Updater',
                'Accept': 'application/vnd.github+json'
            }
        });

        // 超时保护：网络异常时不让检查一直挂起
        timer = setTimeout(() => {
            console.error('[UpdateChecker] Request timeout');
            try {
                request.abort();
            } catch (e) {
                // 请求可能已经结束
            }
            fail('timeout');
        }, 8000);

        request.on('response', (response) => {
            if (response.statusCode !== 200) {
                finish({
                    hasUpdate: false,
                    currentVersion,
                    latestVersion: null,
                    releaseUrl: null,
                    releaseNotes: null,
                    error: `HTTP ${response.statusCode}`
                });
                return;
            }

            let data = '';
            response.on('data', (chunk) => {
                data += chunk;
            });

            response.on('end', () => {
                try {
                    const release = JSON.parse(data);
                    const latestVersion = release.tag_name || release.name || '';
                    const downloadUrl = release.html_url || 'https://github.com/neopen/active-break-clock/releases';

                    console.log('[UpdateChecker] Latest version:', latestVersion);
                    console.log('[UpdateChecker] Download URL:', downloadUrl);

                    const hasUpdate = compareVersions(currentVersion, latestVersion) < 0;

                    finish({
                        hasUpdate,
                        currentVersion,
                        latestVersion,
                        releaseUrl: downloadUrl,
                        releaseNotes: release.body || ''
                    });
                } catch (e) {
                    console.error('[UpdateChecker] Failed to parse response:', e);
                    fail(e.message);
                }
            });
        });

        request.on('error', (e) => {
            console.error('[UpdateChecker] Network error:', e);
            fail(e.message);
        });

        request.end();
    });
}

function checkForUpdateWithRetry(maxRetries = 2, delayMs = 1000) {
    return new Promise(async (resolve) => {
        let lastError = null;
        for (let i = 0; i < maxRetries; i++) {
            const result = await checkForUpdate();
            if (!result.error || i === maxRetries - 1) {
                resolve(result);
                return;
            }
            lastError = result.error;
            await new Promise(r => setTimeout(r, delayMs * (i + 1)));
        }
        resolve({
            hasUpdate: false,
            currentVersion: app.getVersion(),
            latestVersion: null,
            releaseUrl: null,
            releaseNotes: null,
            error: lastError
        });
    });
}

module.exports = {
    checkForUpdate,
    checkForUpdateWithRetry,
    compareVersions
};