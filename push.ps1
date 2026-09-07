Write-Host "Pushing to GitHub..." -ForegroundColor Cyan
git push

if ($LASTEXITCODE -eq 0) {
    Write-Host "Push successful! Watching CI/CD..." -ForegroundColor Green
    $runId = gh run list --limit=1 --json databaseId -q '.[0].databaseId'
    gh run watch $runId --exit-status
} else {
    Write-Host "Push failed!" -ForegroundColor Red
}
