@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion
cd /d "%~dp0\.."

:: 1. 初始化日志目录与时间戳文件名
if not exist logs mkdir logs
for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format 'yyyyMMdd_HHmmss'"') do set "timestamp=%%i"
set "LOG_FILE=logs\build_all_%timestamp%.log"

:: 写入日志头
echo ======================================== >> "%LOG_FILE%" 2>&1
echo 构建类型: 全平台 (Portable + NSIS) | date /t >> "%LOG_FILE%" 2>&1
echo ======================================== >> "%LOG_FILE%" 2>&1

echo ========================================
echo   HealthClock 全平台打包工具（带日志归档）
echo ========================================
echo 📁 日志将保存至: %LOG_FILE%
echo.

:: 2. 清理旧产物
echo [1/4] 清理旧构建产物...
rd /s /q dist release 2>nul
echo ✅ 清理完成 | tee -a "%LOG_FILE%" >nul 2>&1 || echo ✅ 清理完成 >> "%LOG_FILE%" 2>&1
echo.

:: 3. 编译
echo [2/4] 编译前端与主进程代码...
call npm run build >> "%LOG_FILE%" 2>&1
if !errorlevel! neq 0 (
    echo ❌ 编译失败！详细日志见: %LOG_FILE%
    pause & exit /b 1
)
echo ✅ 编译完成 >> "%LOG_FILE%" 2>&1
echo.

:: 4. 打包
echo [3/4] 打包便携版与 NSIS 安装版...
call npx electron-builder --win --x64 --config.win.target=portable,nsis >> "%LOG_FILE%" 2>&1
if !errorlevel! neq 0 (
    echo ❌ 打包失败！详细日志见: %LOG_FILE%
    pause & exit /b 1
)
echo ✅ 打包完成 >> "%LOG_FILE%" 2>&1
echo.

:: 5. 完成提示
echo [4/4] 打包完成！文件已输出至 release 目录：
echo ========================================
dir /b release\*.exe 2>nul
echo.
echo 💡 提示：文件名已按 electron-builder.yml 自动生成
echo    便携版: HealthClock-<版本>-x64-Portable.exe
echo    安装版: HealthClock-<版本>-x64-Setup.exe
echo 📄 完整构建日志: %LOG_FILE%
echo ========================================
pause