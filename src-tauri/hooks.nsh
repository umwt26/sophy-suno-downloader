!macro NSIS_HOOK_PREINSTALL
  ; 1. Terminate any running sophy.exe processes so binaries aren't locked
  nsExec::Exec 'taskkill /F /IM sophy.exe /T'
  Sleep 300

  ; 2. Check if legacy machine-wide v0.1.0 exists in Program Files and uninstall it silently
  IfFileExists "$PROGRAMFILES\Sophy Studio\uninstall.exe" 0 +4
    ExecWait '"$PROGRAMFILES\Sophy Studio\uninstall.exe" /S _?="$PROGRAMFILES\Sophy Studio"'
    RMDir /r "$PROGRAMFILES\Sophy Studio"
    DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Sophy Studio"

  IfFileExists "$PROGRAMFILES\Sophy\uninstall.exe" 0 +4
    ExecWait '"$PROGRAMFILES\Sophy\uninstall.exe" /S _?="$PROGRAMFILES\Sophy"'
    RMDir /r "$PROGRAMFILES\Sophy"
    DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Sophy"

  ; 3. Clean up legacy public & common shortcuts from old machine-wide install
  Delete "$COMMONDESKTOP\Sophy Studio.lnk"
  Delete "$COMMONDESKTOP\Sophy.lnk"
  Delete "$COMMONPROGRAMS\Sophy Studio.lnk"
  Delete "$COMMONPROGRAMS\Sophy.lnk"
  Delete "$DESKTOP\Sophy.lnk"
  Delete "$SMPROGRAMS\Sophy.lnk"

  ; 4. Check if an older currentUser version exists and clean it up before writing new files
  ReadRegStr $0 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Sophy Studio" "UninstallString"
  StrCmp $0 "" +3 0
  StrCmp $0 "$INSTDIR\uninstall.exe" +2 0
    ExecWait '$0 /S _?=$LOCALAPPDATA\Sophy Studio'
!macroend

!macro NSIS_HOOK_POSTINSTALL
  ; Create LocalAppData/SophyStudio/bin directory
  CreateDirectory "$LOCALAPPDATA\SophyStudio\bin"

  ; Silently start background download of ffmpeg, ffprobe and yt-dlp if not already present
  ExecShell "" "powershell.exe" "-WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -Command `if (!(Test-Path '$LOCALAPPDATA\SophyStudio\bin\ffmpeg.exe')) { try { (New-Object System.Net.WebClient).DownloadFile('https://github.com/eugeneware/ffmpeg-static/releases/latest/download/ffmpeg-win32-x64', '$LOCALAPPDATA\SophyStudio\bin\ffmpeg.exe') } catch {} }; if (!(Test-Path '$LOCALAPPDATA\SophyStudio\bin\ffprobe.exe')) { try { (New-Object System.Net.WebClient).DownloadFile('https://github.com/eugeneware/ffmpeg-static/releases/latest/download/ffprobe-win32-x64', '$LOCALAPPDATA\SophyStudio\bin\ffprobe.exe') } catch {} }; if (!(Test-Path '$LOCALAPPDATA\SophyStudio\bin\yt-dlp.exe')) { try { (New-Object System.Net.WebClient).DownloadFile('https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe', '$LOCALAPPDATA\SophyStudio\bin\yt-dlp.exe') } catch {} }`"
!macroend

!macro NSIS_HOOK_PREUNINSTALL
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
!macroend
