@echo off
chcp 65001 >nul
cd /d "%~dp0\.."
echo ========================================
echo   HealthClock NSIS 安装版打包工具
echo ========================================
echo.

set UPX="lib\upx.exe"

REM 检查 UPX
if not exist %UPX% (
    echo 警告: 未找到 upx.exe，跳过压缩步骤
    set UPX=
)

REM echo [1/5] 清理旧文件...
REM rd /s /q dist 2>nul
REM echo 完成

echo.
echo [2/5] 打包 NSIS 安装版...
echo 目标架构: x64
echo 安装包类型: NSIS (可安装到 Program Files，支持开机自启动)
call npx electron-builder --win --x64 --config.win.target=nsis
echo 完成

echo.
echo [3/5] 重命名安装包...
cd dist
for %%f in (*Setup*.exe) do (
    if not "%%f"=="HealthClock_Setup.exe" (
        echo 重命名: %%f -> HealthClock_Setup.exe
        ren "%%f" "HealthClock_Setup.exe" 2>nul
    )
)
cd ..
echo 完成

echo.
echo [4/5] UPX 压缩安装包...
if defined UPX (
    for %%f in (dist\*.exe) do (
        echo 压缩: %%f
        echo 压缩前:
        dir "%%f" | find "%%~nxf"
        
        REM 标准压缩
        %UPX% --best "%%f"
        
        REM LZMA 压缩
        %UPX% --lzma "%%f" 2>nul
    )
    echo 完成
) else (
    echo 跳过 UPX 压缩
)

echo.
echo [5/5] 显示文件信息...
echo ========================================
echo 打包完成！文件列表：
echo ========================================
dir dist\*.exe

echo.
echo ========================================
echo   NSIS 安装版打包完成！
echo   安装包位置: dist\HealthClock_Setup.exe
echo ========================================
pause