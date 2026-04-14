@echo off
chcp 65001 >nul
echo ========================================
echo   HealthClock 极限压缩工具
echo ========================================
echo.

REM 设置 7-Zip 路径
set SEVENZIP="D:\Program Files\7-Zip\7z.exe"
if not exist %SEVENZIP% (
    echo 错误: 未找到 7-Zip，请安装后重试
    pause
    exit /b 1
)

REM 设置 UPX 路径
set UPX="lib\upx.exe"
if not exist %UPX% (
    echo 错误: 未找到 upx.exe
    pause
    exit /b 1
)

REM 设置 npm 本地 bin 路径
set LOCAL_BIN=.\node_modules\.bin
set PATH=%LOCAL_BIN%;%PATH%

echo [1/5] 清理旧文件...
rd /s /q dist 2>nul
rd /s /q temp 2>nul
md temp 2>nul
echo 完成

echo [2/5] 安装依赖...
call npm install --no-audit --no-fund
if errorlevel 1 (
    echo npm install 失败
    pause
    exit /b 1
)
echo 完成

echo [3/5] 打包生成未压缩目录...
call npx electron-builder --win --x64 --dir
if errorlevel 1 (
    echo 打包失败
    pause
    exit /b 1
)
echo 完成

echo [4/5] UPX 极限压缩主程序...
if exist "dist\win-unpacked\HealthClock.exe" (
    echo 压缩前:
    dir "dist\win-unpacked\HealthClock.exe"
    
    echo 正在压缩...
    %UPX% --best --ultra-brute --lzma "dist\win-unpacked\HealthClock.exe"
    
    echo 压缩后:
    dir "dist\win-unpacked\HealthClock.exe"
) else (
    echo 未找到主程序
    pause
    exit /b 1
)
echo 完成

echo [5/5] 重新打包成安装包...
call npx electron-builder --win --x64 --prepackaged=dist\win-unpacked
if errorlevel 1 (
    echo 重新打包失败
    pause
    exit /b 1
)
echo 完成

echo.
echo ========================================
echo   压缩完成！
echo ========================================
echo.
echo 安装包位置:
dir dist\*.exe
echo.
pause