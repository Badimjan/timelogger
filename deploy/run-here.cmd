@echo off
rem Double-click to run Timelogger in this window (Ctrl+C stops it). Pass options through, e.g. run-here.cmd -Port 8080
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0run-here.ps1" %*
pause
