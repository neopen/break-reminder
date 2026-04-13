// preload.js
window.addEventListener('DOMContentLoaded', () => {
    // 监听自定义事件，实现窗口控制
    window.addEventListener('request-fullscreen-always-on-top', () => {
        const { BrowserWindow } = require('electron');
        const win = BrowserWindow.getFocusedWindow();
        if (win) {
            win.setFullScreen(true);
            win.setAlwaysOnTop(true, 'screen-saver');
            win.setVisibleOnAllWorkspaces(true);
        }
    });

    window.addEventListener('exit-fullscreen-always-on-top', () => {
        const { BrowserWindow } = require('electron');
        const win = BrowserWindow.getFocusedWindow();
        if (win) {
            win.setFullScreen(false);
            win.setAlwaysOnTop(false);
            win.setVisibleOnAllWorkspaces(false);
        }
    });
});