@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion
cd /d "%~dp0\.."

:: 初始化日志
if not exist logs mkdir logs
for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format 'yyyyMMdd_HHmmss'"') do set "timestamp=%%i"
set "LOG_FILE=logs\build_neu_!timestamp!.log"

echo ======================================== >> "!LOG_FILE!" 2>&1
echo 构建类型: Neutralino.js Windows | date /t >> "!LOG_FILE!" 2>&1
echo ======================================== >> "!LOG_FILE!" 2>&1

echo ========================================
echo   HealthClock Neutralino 打包工具
echo ========================================
echo 📁 日志: !LOG_FILE!
echo.

echo [1/3] 清理旧产物...
rd /s /q dist release 2>nul
echo ✅ 清理完成 >> "!LOG_FILE!" 2>&1
echo.

echo [2/3] 构建应用...
call npm run build:win >> "!LOG_FILE!" 2>&1
if !errorlevel! neq 0 (
    echo ❌ 构建失败！详见: !LOG_FILE!
    pause & exit /b 1
)
echo ✅ 构建完成 >> "!LOG_FILE!" 2>&1
echo.

echo [3/3] 检查产物...
echo ========================================
echo 🎉 构建完成！
echo 📦 产物位置:
dir /b /s dist\HealthClock-*\HealthClock.exe 2>nul
echo 📊 文件大小:
for %%f in (dist\HealthClock-*\HealthClock.exe) do @echo    %%~nxf - %%~zf bytes
echo 📄 完整日志: !LOG_FILE!
echo ========================================
pause