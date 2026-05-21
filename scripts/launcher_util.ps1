# Timed helpers for start_project.bat / stop_project.bat (netstat ports, bounded HTTP/WMI).
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('PortListening', 'HttpGet', 'HttpPost', 'PostgresService', 'MlPredict')]
    [string]$Action,

    [string]$Port = '',
    [string]$Url = '',
    [string]$BaseUrl = '',
    [string]$ProbeName = '__pls_launcher_probe__',
    [int]$TimeoutSec = 10,
    [int]$Retries = 1
)

function Test-PortListeningNetstat {
    param([string]$TargetPort)
    $pattern = ":$TargetPort "
    $lines = netstat -ano 2>$null
    if (-not $lines) { return $false }
    foreach ($line in $lines) {
        if ($line -notmatch 'LISTENING') { continue }
        if ($line -match [regex]::Escape($pattern)) { return $true }
    }
    return $false
}

switch ($Action) {
    'PortListening' {
        if (Test-PortListeningNetstat -TargetPort $Port) { exit 0 }
        exit 1
    }
    'HttpGet' {
        for ($i = 0; $i -lt $Retries; $i++) {
            try {
                $r = Invoke-WebRequest -Uri $Url -Method GET -UseBasicParsing -TimeoutSec $TimeoutSec
                if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 300) { exit 0 }
            } catch {}
            if ($i -lt ($Retries - 1)) { Start-Sleep -Seconds 1 }
        }
        exit 1
    }
    'HttpPost' {
        for ($i = 0; $i -lt $Retries; $i++) {
            try {
                $r = Invoke-WebRequest -Uri $Url -Method POST -UseBasicParsing -TimeoutSec $TimeoutSec
                if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 300) { exit 0 }
            } catch {}
            if ($i -lt ($Retries - 1)) { Start-Sleep -Seconds 1 }
        }
        exit 1
    }
    'PostgresService' {
        $job = Start-Job {
            $svc = Get-Service -ErrorAction SilentlyContinue |
                Where-Object { $_.Name -match 'postgres' -or $_.DisplayName -match 'PostgreSQL' }
            if (-not $svc) { return 3 }
            if (($svc | Where-Object { $_.Status -eq 'Running' }).Count -gt 0) { return 0 }
            return 2
        }
        if (-not (Wait-Job -Job $job -Timeout $TimeoutSec)) {
            Stop-Job -Job $job -Force -ErrorAction SilentlyContinue
            Remove-Job -Job $job -Force -ErrorAction SilentlyContinue
            exit 4
        }
        $code = Receive-Job -Job $job
        Remove-Job -Job $job -Force -ErrorAction SilentlyContinue
        exit [int]$code
    }
    'MlPredict' {
        try {
            $students = Invoke-RestMethod -Uri ($BaseUrl + '/api/students') -TimeoutSec $TimeoutSec
            if ($students -and @($students).Count -gt 0) {
                $sid = $students[0].id
            } else {
                try {
                    $body = @{ name = $ProbeName } | ConvertTo-Json
                    $s = Invoke-RestMethod -Method POST -Uri ($BaseUrl + '/api/auth/student/register') `
                        -ContentType 'application/json' -Body $body -TimeoutSec $TimeoutSec
                    $sid = $s.id
                } catch {
                    $body = @{ name = $ProbeName } | ConvertTo-Json
                    $s = Invoke-RestMethod -Method POST -Uri ($BaseUrl + '/api/auth/student/login') `
                        -ContentType 'application/json' -Body $body -TimeoutSec $TimeoutSec
                    $sid = $s.id
                }
            }
            $r = Invoke-RestMethod -Method POST -Uri ($BaseUrl + '/api/ml/predict?student_id=' + $sid) -TimeoutSec $TimeoutSec
            if ($r.student_id) { exit 0 }
            exit 1
        } catch {
            exit 1
        }
    }
}
