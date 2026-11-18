@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion
cd /d "%~dp0\.."

:: 1. 初始化日志
if not exist logs mkdir logs
for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format 'yyyyMMdd_HHmmss'"') do set "timestamp=%%i"
set "LOG_FILE=logs\build_portable_%timestamp%.log"

echo ======================================== >> "%LOG_FILE%" 2>&1
echo 构建类型: Portable 便携版 | date /t >> "%LOG_FILE%" 2>&1
echo ======================================== >> "%LOG_FILE%" 2>&1

echo ========================================
echo   HealthClock 便携版打包工具（带日志）
echo ========================================
echo  日志文件: %LOG_FILE%
echo.

:: 0. 关闭正在运行的旧版本，否则 release 目录被占用会导致打包失败
echo [0/4] 检测正在运行的应用...
set "RUN_COUNT=0"
for /f %%i in ('powershell -NoProfile -Command "@(Get-Process -Name 别坐了 -ErrorAction SilentlyContinue).Count"') do set "RUN_COUNT=%%i"
if not "!RUN_COUNT!"=="0" (
    echo   检测到 !RUN_COUNT! 个进程，正在关闭...
    echo 检测到 !RUN_COUNT! 个运行中进程，已尝试关闭 >> "%LOG_FILE%" 2>&1
    taskkill /F /IM "别坐了.exe" >nul 2>&1
    ping -n 3 127.0.0.1 >nul
)

echo [1/4] 清理旧文件...
rd /s /q dist release 2>nul
if exist release (
    echo [错误] release 目录无法删除，文件仍被占用。
    echo        请从托盘退出“别坐了”后重试。
    echo release 目录删除失败 >> "%LOG_FILE%" 2>&1
    pause & exit /b 1
)
echo  清理完成 >> "%LOG_FILE%" 2>&1
echo.

echo [2/4] 编译项目...
call npm run build >> "%LOG_FILE%" 2>&1
if !errorlevel! neq 0 (
    echo  编译失败！详见: %LOG_FILE%
    pause & exit /b 1
)
echo  编译完成 >> "%LOG_FILE%" 2>&1
echo.

echo [3/4] 打包便携版...
call npx electron-builder --win --x64 --config.win.target=portable >> "%LOG_FILE%" 2>&1
if !errorlevel! neq 0 (
    echo  打包失败！详见: %LOG_FILE%
    pause & exit /b 1
)
echo  打包完成 >> "%LOG_FILE%" 2>&1
echo.
echo ========================================
echo  打包完成！请查看 release 目录：
dir /b release\*Portable*.exe 2>nul
echo  完整日志: %LOG_FILE%
echo ========================================

echo [4/4] 分析 app.asar 结构...
call npx asar list release\win-unpacked\resources\app.asar >> "%LOG_FILE%" 2>&1
echo.


pause