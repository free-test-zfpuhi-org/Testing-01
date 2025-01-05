$executable = "chrome"
$idleLimitSeconds = 300  #5 minutes The script will check if the process is idle for 5 minutes (300 seconds) based on its CPU usage
$checkIntervalSeconds = 120  #The script will check for running processes every 2 minutes
$expectedPath = "Pat:to\GoogleChromePortable.exe"
$cpuThreshold = 0.1  #CPU usage threshold for idleness
$suspectIdleThreshold = 600  #10 minutes before force-kill of a suspect idle process
$mutexName = "Global\ShowStopperMutex"  #Ensures that only one instance of the script is running at a time by creating a named mutex
$eventSource = "ShowStopper" #The event source name for logging information to the Windows event log
$debugMode = $true
$logFilePath = "Pat:to\Logs\ShowStopper_log.txt" # Path for the log file

# Ensure the event source exists
if (-not (Get-EventLog -LogName Application -Source $eventSource -ErrorAction SilentlyContinue)) {
    New-EventLog -LogName Application -Source $eventSource
}

# Ensure the log directory exists
$logDir = Split-Path $logFilePath
if (-not (Test-Path $logDir)) {
    New-Item -Path $logDir -ItemType Directory -Force
}

# Check if the log file is older than 7 days and clear it if true
if (Test-Path $logFilePath) {
    $logFileAge = (Get-Item $logFilePath).LastWriteTime
    if ((Get-Date) - $logFileAge -gt (New-TimeSpan -Days 7)) {
        Clear-Content $logFilePath
    }
}

# Function to write to log file
function Write-LogFile {
    param (
        [string]$message
    )
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "$timestamp - $message"
    Add-Content -Path $logFilePath -Value $logMessage
}

# Mutex initialization
$createdNew = $null
$mutex = [System.Threading.Mutex]::new($false, $mutexName, [ref]$createdNew)

if (-not $createdNew) {
    Write-EventLog -LogName Application -Source $eventSource -EntryType Warning -EventId 1002 -Message "Script is already running. Current Process ID: $($PID)"
    exit 1
}

# Debugging function
function Write-DebugLog {
    param (
        [string]$message
    )
    if ($debugMode) {
        Write-Host "DEBUG: $message"
        Write-LogFile $message
        Write-EventLog -LogName Application -Source $eventSource -EntryType Information -EventId 1007 -Message $message
    }
}

# Process monitoring function
function Monitor-Process {
    param (
        [int]$processId,
        [string]$processPath
    )

    try {
        Write-DebugLog "Checking process with PID $($processId), Path: $($processPath)"

        if ($processPath -eq $expectedPath) {
            $initialProcess = Get-Process -Id $processId -ErrorAction SilentlyContinue
            if ($initialProcess) {
                $cpuSamples = @() # Store CPU usage samples
                
                for ($i = 0; $i -lt ($idleLimitSeconds / $checkIntervalSeconds); $i++) {
                    $currentProcess = Get-Process -Id $processId -ErrorAction SilentlyContinue
                    if ($currentProcess) {
                        $cpuSamples += $currentProcess.CPU
                        Start-Sleep -Seconds $checkIntervalSeconds
                    } else {
                        break # Process no longer exists
                    }
                }
                
                if ($cpuSamples.Count -gt 1) {
                    $cpuDifference = $cpuSamples[-1] - $cpuSamples[0]
                    $averageCpuUsage = $cpuDifference / ($cpuSamples.Count - 1)

                    Write-DebugLog "CPU Usage for PID $($processId): Difference=$cpuDifference, Average=$averageCpuUsage"

                    # Idle condition
                    if ($cpuDifference -lt $cpuThreshold -and $averageCpuUsage -lt $cpuThreshold) {
                        Stop-Process -Id $processId -Force
                        Write-LogFile "Killed idle process with PID $($processId). CPU Difference=$cpuDifference, Average=$averageCpuUsage"
                        Write-EventLog -LogName Application -Source $eventSource -EntryType Information -EventId 1006 -Message "Killed idle process with PID $($processId). CPU Difference=$cpuDifference, Average=$averageCpuUsage"
                    }
                }
            }
        }
    } catch {
        Write-EventLog -LogName Application -Source $eventSource -EntryType Error -EventId 1003 -Message "Error processing PID $($processId): $_"
    }
}


try {
    while ($true) {
        $matchingProcesses = Get-Process -Name $executable -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq $expectedPath }

        if ($matchingProcesses.Count -eq 0) {
            Write-DebugLog "No matching Chrome processes found. Exiting."
            break
        }

        foreach ($process in $matchingProcesses) {
            Monitor-Process -processId $process.Id -processPath $process.Path
        }

        Start-Sleep -Seconds $checkIntervalSeconds
    }
} catch {
    Write-EventLog -LogName Application -Source $eventSource -EntryType Error -EventId 1004 -Message "Script encountered a fatal error and will exit: $_"
    exit 1
} finally {
    try {
        if ($createdNew -and $mutex.WaitOne(0)) {
            $mutex.ReleaseMutex()
        }
    } catch {
        Write-DebugLog "Error releasing mutex: $_"
    } finally {
        $mutex.Dispose()
    }
}