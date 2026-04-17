@echo off
chcp 65001 >nul
cd /d "%~dp0\.."
echo ========================================
echo   HealthClock 便携版打包工具
echo ========================================
echo.

set UPX="lib\upx.exe"

REM 设置 UPX 路径
if not exist %UPX% (
    echo 错误: 未找到 upx.exe
    pause
    exit /b 1
)

REM echo [1/4] 清理旧文件...
REM rd /s /q dist 2>nul
REM echo 完成

echo.
echo [2/4] 打包便携版...
call npx electron-builder --win --x64 --config.win.target=portable
echo 完成

echo [3/4] UPX 极限压缩...
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

echo.
echo [4/4] 显示文件信息...
echo ========================================
echo 打包完成！文件列表：
echo ========================================
dir dist\*.exe

echo.
echo ========================================
echo   便携版打包完成！
echo   文件位置: dist\HealthClock_Portable.exe
echo ========================================
pause