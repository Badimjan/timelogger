' Starts the Timelogger server with no console window at all (window style 0).
' powershell -WindowStyle Hidden still flashes a console that can be closed by accident, which kills the server.
Dim shell, here
Set shell = CreateObject("WScript.Shell")
here = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
shell.Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -File """ & here & "\start-server.ps1""", 0, False
