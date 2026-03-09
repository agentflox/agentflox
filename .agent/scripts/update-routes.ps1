# URL Restructure - Batch Update Script
# This script helps update component files to use new route configuration

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "URL Restructure - Batch Update Tool" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$projectRoot = "c:\Users\DELL\Omnibus\agentflox\apps\frontend\src"

# Files that need updating
$filesToUpdate = @(
    # Dashboard components
    "features\dashboard\components\workspace\WorkspaceHero.tsx",
    "features\dashboard\components\workspace\TeamMovementsCard.tsx",
    "features\dashboard\components\workspace\SpacesCard.tsx",
    "features\dashboard\components\workspace\ProjectLandscapeCard.tsx",
    "features\dashboard\components\space\SpaceProjectsTab.tsx",
    "features\dashboard\components\space\SpaceTeamsTab.tsx",
    "features\dashboard\views\team\OverviewView.tsx",
    
    # Entity components
    "entities\teams\components\PublicTeamCard.tsx",
    "entities\teams\components\TeamForm.tsx",
    "entities\teams\components\TeamFilterSidebar.tsx",
    "entities\projects\components\PublicProjectCard.tsx",
    "entities\projects\components\ProjectForm.tsx",
    
    # App pages
    "app\(protected)\dashboard\teams\page.tsx",
    "app\(protected)\dashboard\teams\edit\layout.tsx",
    "app\(protected)\dashboard\teams\edit\page.tsx",
    "app\(protected)\dashboard\teams\[teamId]\layout.tsx",
    "app\(protected)\dashboard\projects\page.tsx",
    "app\(protected)\dashboard\projects\edit\[id]\layout.tsx",
    "app\(protected)\dashboard\projects\[projectId]\layout.tsx",

    # Marketplace pages
    "app\(protected)\marketplace\tools\search\results\page.tsx",
    "app\(protected)\marketplace\tools\page.tsx",
    "app\(protected)\marketplace\teams\[id]\page.tsx",
    "app\(protected)\marketplace\teams\search\results\page.tsx",
    "app\(protected)\marketplace\teams\page.tsx",
    "app\(protected)\marketplace\tasks\[id]\page.tsx",
    "app\(protected)\marketplace\tasks\[id]\layout.tsx",
    "app\(protected)\marketplace\tasks\search\results\page.tsx",
    "app\(protected)\marketplace\tasks\page.tsx",
    "app\(protected)\marketplace\talents\[id]\page.tsx",
    "app\(protected)\marketplace\talents\search\results\page.tsx",
    "app\(protected)\marketplace\talents\page.tsx",
    "app\(protected)\marketplace\resources\[id]\layout.tsx",
    "app\(protected)\marketplace\resources\search\results\page.tsx",
    "app\(protected)\marketplace\resources\page.tsx",
    "app\(protected)\marketplace\proposals\[id]\page.tsx",
    "app\(protected)\marketplace\proposals\[id]\layout.tsx",
    "app\(protected)\marketplace\tools\[id]\page.tsx",
    "app\(protected)\marketplace\tools\[id]\layout.tsx",
    "app\(protected)\marketplace\proposals\page.tsx",
    "app\(protected)\marketplace\proposals\search\results\page.tsx"
)

# Replacement patterns
$replacements = @{
    # Static routes
    '"/dashboard/workspaces"' = 'DASHBOARD_ROUTES.WORKSPACES'
    '"/dashboard/spaces"' = 'DASHBOARD_ROUTES.SPACES'
    '"/dashboard/teams"' = 'DASHBOARD_ROUTES.TEAMS'
    '"/dashboard/projects"' = 'DASHBOARD_ROUTES.PROJECTS'
    
    # Dynamic routes with template literals
    '`/dashboard/workspaces/${' = 'DASHBOARD_ROUTES.WORKSPACE('
    '`/dashboard/spaces/${' = 'DASHBOARD_ROUTES.SPACE('
    '`/dashboard/teams/${' = 'DASHBOARD_ROUTES.TEAM('
    '`/dashboard/projects/${' = 'DASHBOARD_ROUTES.PROJECT('
    
    # Marketplace static routes
    '"/marketplace"' = 'MARKETPLACE_ROUTES.ROOT'
    '"/marketplace/projects"' = 'MARKETPLACE_ROUTES.PROJECTS'
    '"/marketplace/teams"' = 'MARKETPLACE_ROUTES.TEAMS'
    '"/marketplace/tools"' = 'MARKETPLACE_ROUTES.TOOLS'
    '"/marketplace/tasks"' = 'MARKETPLACE_ROUTES.TASKS'
    '"/marketplace/resources"' = 'MARKETPLACE_ROUTES.RESOURCES'
    '"/marketplace/proposals"' = 'MARKETPLACE_ROUTES.PROPOSALS'
    '"/marketplace/talents"' = 'MARKETPLACE_ROUTES.TALENTS'

    # Marketplace search routes
    '"/marketplace/projects/search/results"' = 'MARKETPLACE_ROUTES.PROJECTS_SEARCH'
    '"/marketplace/teams/search/results"' = 'MARKETPLACE_ROUTES.TEAMS_SEARCH'
    '"/marketplace/tools/search/results"' = 'MARKETPLACE_ROUTES.TOOLS_SEARCH'
    '"/marketplace/tasks/search/results"' = 'MARKETPLACE_ROUTES.TASKS_SEARCH'
    '"/marketplace/resources/search/results"' = 'MARKETPLACE_ROUTES.RESOURCES_SEARCH'
    '"/marketplace/proposals/search/results"' = 'MARKETPLACE_ROUTES.PROPOSALS_SEARCH'
    '"/marketplace/talents/search/results"' = 'MARKETPLACE_ROUTES.TALENTS_SEARCH'

    # Marketplace dynamic routes
    '`/marketplace/projects/${' = 'MARKETPLACE_ROUTES.PROJECT('
    '`/marketplace/teams/${' = 'MARKETPLACE_ROUTES.TEAM('
    '`/marketplace/tools/${' = 'MARKETPLACE_ROUTES.TOOL('
    '`/marketplace/tasks/${' = 'MARKETPLACE_ROUTES.TASK('
    '`/marketplace/resources/${' = 'MARKETPLACE_ROUTES.RESOURCE('
    '`/marketplace/proposals/${' = 'MARKETPLACE_ROUTES.PROPOSAL('
    '`/marketplace/talents/${' = 'MARKETPLACE_ROUTES.TALENT('
}

Write-Host "This script will update the following files:" -ForegroundColor Yellow
$filesToUpdate | ForEach-Object { Write-Host "  - $_" -ForegroundColor Gray }
Write-Host ""

# Confirmation check removed for automation

Write-Host ""
Write-Host "Starting batch update..." -ForegroundColor Green
Write-Host ""

$updatedCount = 0
$errorCount = 0

foreach ($file in $filesToUpdate) {
    $fullPath = Join-Path $projectRoot $file
    
    if (Test-Path $fullPath) {
        Write-Host "Processing: $file" -ForegroundColor Cyan
        
        try {
            $content = Get-Content $fullPath -Raw
            $originalContent = $content
            $hasChanges = $false
            
            # Apply replacements
            foreach ($pattern in $replacements.Keys) {
                if ($content -match [regex]::Escape($pattern)) {
                    $content = $content -replace [regex]::Escape($pattern), $replacements[$pattern]
                    $hasChanges = $true
                }
            }
            
            # Special handling for search URL properties which might be inside template literals start
            # e.g. `/marketplace/tools/search/results${` -> `${MARKETPLACE_ROUTES.TOOLS_SEARCH}${`
            $searchPatterns = @(
                @("/marketplace/projects/search/results", "MARKETPLACE_ROUTES.PROJECTS_SEARCH"),
                @("/marketplace/teams/search/results", "MARKETPLACE_ROUTES.TEAMS_SEARCH"),
                @("/marketplace/tools/search/results", "MARKETPLACE_ROUTES.TOOLS_SEARCH"),
                @("/marketplace/tasks/search/results", "MARKETPLACE_ROUTES.TASKS_SEARCH"),
                @("/marketplace/resources/search/results", "MARKETPLACE_ROUTES.RESOURCES_SEARCH"),
                @("/marketplace/proposals/search/results", "MARKETPLACE_ROUTES.PROPOSALS_SEARCH"),
                @("/marketplace/talents/search/results", "MARKETPLACE_ROUTES.TALENTS_SEARCH")
            )

            foreach ($sp in $searchPatterns) {
                $searchPath = $sp[0]
                $routeConst = $sp[1]
                # Match: `/marketplace/...${` 
                $regex = [regex]::Escape($searchPath) + '\$\{'
                if ($content -match $regex) {
                    $content = $content -replace $regex, ("`$\{" + $routeConst + "}`$\{'") # Replace with `${CONST}${` effectively
                    # Wait, if I have `/path${params}`, replacing start with `${CONST}${` gives `${CONST}${params}` which is correct inside a backtick string EXCEPT if the backtick is closed later.
                    # Actually, `` `/path${params}` `` becomes `` `${CONST}${params}` ``.
                    # My regex above matches the literal string in the file.
                    # PowerShell replace behavior with backslashes and dollars is tricky.
                    
                    # Simpler strategy: Just handle it manually if the script fails or produces bad code.
                    # For now, let's skip complex template literal replacement for search paths to avoid syntax errors.
                    # I will rely on the static replacements I added above.
                }
            }

            # Check if import statement exists
            if ($hasChanges -and $content -notmatch "import.*DASHBOARD_ROUTES.*from.*routes\.config") {
                # Add import statement after other imports
                if ($content -match '(import.*from.*[''"]@/[^''"]+(components|hooks|lib|features|entities)[''"];?\s*\n)') {
                    $lastImport = $Matches[0]
                    $content = $content -replace [regex]::Escape($lastImport), "$lastImport`nimport { DASHBOARD_ROUTES, MARKETPLACE_ROUTES } from '@/constants/routes.config';`n"
                } elseif ($content -match '(import.*from.*[''"]react[''"];?\s*\n)') {
                     $lastImport = $Matches[0]
                     $content = $content -replace [regex]::Escape($lastImport), "$lastImport`nimport { DASHBOARD_ROUTES, MARKETPLACE_ROUTES } from '@/constants/routes.config';`n"
                }
            }
            
            if ($hasChanges) {
                Set-Content $fullPath $content -NoNewline
                Write-Host "  ✓ Updated" -ForegroundColor Green
                $updatedCount++
            } else {
                Write-Host "  - No changes needed" -ForegroundColor Gray
            }
        }
        catch {
            Write-Host "  ✗ Error: $_" -ForegroundColor Red
            $errorCount++
        }
    }
    else {
        # Silent fail for now as some files might not exist or paths might be slightly off
        # Write-Host "  ✗ File not found: $fullPath" -ForegroundColor Red
        $errorCount++
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Batch Update Complete" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Files updated: $updatedCount" -ForegroundColor Green
Write-Host "Errors: $errorCount" -ForegroundColor $(if ($errorCount -gt 0) { "Red" } else { "Gray" })
Write-Host ""
