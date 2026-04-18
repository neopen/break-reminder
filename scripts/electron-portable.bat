@echo off
chcp 65001 >nul
cd /d "%~dp0\.."
echo ========================================
echo   HealthClock 便携版打包工具
echo ========================================
echo.

echo [1/3] 清理旧文件...
rd /s /q dist release 2>nul
echo 完成
echo.

echo [2/3] 编译项目...
call npm run build || (echo ❌ 编译失败！ & pause & exit /b 1)
echo 完成
echo.

echo [3/3] 打包便携版...
call npx electron-builder --win --x64 --config.win.target=portable || (echo ❌ 打包失败！ & pause & exit /b 1)
echo 完成
echo.
echo ========================================
echo 打包完成！请查看 release 目录：
dir /b release\*Portable*.exe 2>nul
echo ========================================
pause