@echo off
cd /d "%~dp0"
node web\scripts\start-local.mjs
if errorlevel 1 pause
