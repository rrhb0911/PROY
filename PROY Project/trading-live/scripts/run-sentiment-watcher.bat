@echo off
cd /d "%~dp0"
node sentiment-watcher.mjs >> sentiment-watcher.log 2>&1
