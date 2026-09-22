@echo off
cd /d "%~dp0"
python post_manager.py
if errorlevel 1 pause
