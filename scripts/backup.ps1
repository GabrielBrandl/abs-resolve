# Backup do banco Supabase (PostgreSQL)
# Requer pg_dump instalado e DATABASE_URL no ambiente ou como parâmetro

param(
    [string]$DatabaseUrl = $env:DATABASE_URL
)

if (-not $DatabaseUrl) {
    Write-Error "Defina DATABASE_URL ou passe -DatabaseUrl"
    exit 1
}

$BackupDir = Join-Path $PSScriptRoot "..\backups"
New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupPath = Join-Path $BackupDir "abs_resolve_$Timestamp.sql"

Write-Host "Gerando backup em $BackupPath..."
pg_dump $DatabaseUrl | Out-File -FilePath $BackupPath -Encoding utf8
Write-Host "Backup concluído."
