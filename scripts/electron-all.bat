@echo off
chcp 65001 >nul
cd /d "%~dp0\.."
echo ========================================
echo   HealthClock 全平台打包工具
echo ========================================
echo.

echo [1/4] 清理旧构建产物...
rd /s /q dist release 2>nul
echo 完成
echo.

echo [2/4] 编译前端与主进程代码...
call npm run build || (echo ❌ 编译失败！请检查代码 & pause & exit /b 1)
echo 完成
echo.

echo [3/4] 打包便携版与 NSIS 安装版...
call npx electron-builder --win --x64 --config.win.target=portable,nsis || (echo ❌ 打包失败！ & pause & exit /b 1)
echo 完成
echo.

echo [4/4] 打包完成！文件已输出至 release 目录：
echo ========================================
dir /b release\*.exe 2>nul
echo.
echo 💡 提示：文件名已按 electron-builder.yml 中的 artifactName 自动生成
echo    便携版: HealthClock-v<版本>-x64-Portable.exe
echo    安装版: HealthClock-v<版本>-x64-Setup.exe
echo ========================================
pause