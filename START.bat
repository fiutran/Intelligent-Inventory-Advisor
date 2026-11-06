@echo off
title Intelligent Inventory Advisor
cd /d "%~dp0"

echo.
echo  Intelligent Inventory Advisor
echo  -----------
echo  Starting on this computer...
echo  (First time can take a few minutes.)
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo  Node.js is not installed.
  echo.
  echo  1. Open https://nodejs.org
  echo  2. Download LTS and install it
  echo  3. Restart this PC
  echo  4. Double-click START.bat again
  echo.
  pause
  exit /b 1
)

node scripts\launch.mjs
if errorlevel 1 (
  echo.
  pause
  exit /b 1
)
