# Backup PostgreSQL ABS Resolve
param(
    [string]$BackupDir = ".\backups"
)

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$Filename = "abs_resolve_$Timestamp.sql"
$BackupPath = Join-Path $BackupDir $Filename

if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
}

docker exec abs_resolve_db pg_dump -U abs abs_resolve | Out-File -FilePath $BackupPath -Encoding utf8

# Comprimir
Compress-Archive -Path $BackupPath -DestinationPath "$BackupPath.gz" -Force
Remove-Item $BackupPath

# Manter últimos 7 backups
Get-ChildItem $BackupDir -Filter "abs_resolve_*.gz" |
    Sort-Object LastWriteTime -Descending |
    Select-Object -Skip 7 |
    Remove-Item -Force

Write-Host "Backup criado: $BackupPath.gz"
