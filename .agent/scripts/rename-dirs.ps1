# Directory Rename Script
$ErrorActionPreference = "Stop"

$root = "c:\Users\DELL\Omnibus\agentflox\apps\frontend\src\app\(protected)"

function Safe-Rename {
    param($path, $newName)
    if (Test-Path -LiteralPath $path) {
        try {
            Rename-Item -LiteralPath $path -NewName $newName -ErrorAction Stop
            Write-Host "Renamed $path to $newName" -ForegroundColor Green
        } catch {
             Write-Host "Failed to rename $path to $newName. Error: $_" -ForegroundColor Red
        }
    } else {
        Write-Host "Skipping $path (Not found)" -ForegroundColor Yellow
    }
}

Write-Host "Starting Directory Renaming..." -ForegroundColor Cyan

# Dashboard
Write-Host "Renaming Dashboard Directories..." -ForegroundColor Cyan
Safe-Rename "$root\dashboard\workspaces" "w"
Safe-Rename "$root\dashboard\spaces" "s"
Safe-Rename "$root\dashboard\projects" "pj"
Safe-Rename "$root\dashboard\teams" "tm"

# Marketplace
Write-Host "Renaming Marketplace Directory..." -ForegroundColor Cyan
if (Test-Path -LiteralPath "$root\marketplace") {
    try {
        Rename-Item -LiteralPath "$root\marketplace" -NewName "mp" -ErrorAction Stop
        Write-Host "Renamed marketplace to mp" -ForegroundColor Green
        
        # Subdirectories
        $mpRoot = "$root\mp"
        Write-Host "Renaming Marketplace Subdirectories in $mpRoot..." -ForegroundColor Cyan
        Safe-Rename "$mpRoot\projects" "pj"
        Safe-Rename "$mpRoot\teams" "tm"
        Safe-Rename "$mpRoot\tools" "tl"
        Safe-Rename "$mpRoot\tasks" "tk"
        Safe-Rename "$mpRoot\resources" "rs"
        Safe-Rename "$mpRoot\proposals" "pp"
    } catch {
        Write-Host "Failed to rename marketplace directory. Error: $_" -ForegroundColor Red
    }
} else {
     Write-Host "Marketplace directory not found at $root\marketplace" -ForegroundColor Red
}

Write-Host "Directory Rename Complete" -ForegroundColor Cyan
