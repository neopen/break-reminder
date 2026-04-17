@echo off
chcp 65001 >nul
cd /d "%~dp0\.."
echo ========================================
echo   HealthClock 全平台打包工具
echo ========================================
echo.

set UPX="lib\upx.exe"

if not exist %UPX% (
    echo 警告: 未找到 upx.exe，跳过压缩步骤
    set UPX=
)

echo [1/6] 清理旧文件...
rd /s /q dist 2>nul
echo 完成

echo.
echo [2/6] 打包便携版...
echo 目标: Portable (免安装)
call npx electron-builder --win --x64 --config.win.target=portable
echo 完成

echo.
echo [3/6] 打包 NSIS 安装版...
echo 目标: NSIS (可安装，支持开机自启动)
call npx electron-builder --win --x64 --config.win.target=nsis
echo 完成

echo.
echo [4/6] 重命名文件...
cd dist
for %%f in (*Portable*.exe) do (
    echo 重命名: %%f -> HealthClock_Portable.exe
    ren "%%f" "HealthClock_Portable.exe" 2>nul
)
for %%f in (*Setup*.exe) do (
    echo 重命名: %%f -> HealthClock_Setup.exe
    ren "%%f" "HealthClock_Setup.exe" 2>nul
)
cd ..
echo 完成

echo.
echo [5/6] UPX 压缩...
if defined UPX (
    for %%f in (dist\*.exe) do (
        echo 压缩: %%f
        echo 压缩前:
        dir "%%f" | find "%%~nxf"
        %UPX% --best "%%f"
        %UPX% --lzma "%%f" 2>nul
    )
    echo 完成
) else (
    echo 跳过 UPX 压缩
)

echo.
echo [6/6] 显示文件信息...
echo ========================================
echo 打包完成！文件列表：
echo ========================================
dir dist\*.exe

echo.
echo ========================================
echo   打包完成！
echo   便携版: dist\HealthClock_Portable.exe
echo   安装版: dist\HealthClock_Setup.exe
echo ========================================
pause