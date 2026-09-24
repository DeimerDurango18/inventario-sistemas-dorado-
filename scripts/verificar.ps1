# ============================================================
# ETICOS - Verificar estado del entorno PUBLICO
# Uso:
#   powershell -ExecutionPolicy Bypass -File .\verificar.ps1
# ============================================================
$ErrorActionPreference = "Continue"

Write-Host "== Procesos ETICOS =="
Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -match "InventarioEquiposEticos|cloudflared" } |
    Select-Object ProcessId, Name, CommandLine | Format-List

Write-Host "== Puertos =="
foreach ($p in 8500, 5173) {
    $l = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue
    if ($l) { Write-Host ("  puerto {0}: EN USO (PID {1})" -f $p, ((($l.OwningProcess | Sort-Object -Unique) -join ","))) -ForegroundColor Green }
    else    { Write-Host ("  puerto {0}: libre" -f $p) -ForegroundColor Yellow }
}

Write-Host "== Tunel cloudflared =="
$tlog = "$env:TEMP\eticos_tunnel.cloudflared.log"
if (Test-Path $tlog) {
    $c = Get-Content -LiteralPath $tlog -Raw
    $m = [regex]::Match($c, "https://[a-z0-9-]+\.trycloudflare\.com")
    if ($m.Success) {
        Write-Host ("  " + $m.Value) -ForegroundColor Green
        Write-Host "  ultimas 5 lineas del log:"
        Get-Content -LiteralPath $tlog -Tail 5
    } else {
        Write-Host "  sin URL publica detectada aun." -ForegroundColor Yellow
    }
} else {
    Write-Host "  sin log de tunel ($tlog). Ejecuta primero levantar.ps1." -ForegroundColor Yellow
}

Write-Host "== Smoke login (tunel directo, igual que el frontend) =="
$body = '{"username":"admin","password":"Admin123!"}'
$turl = $null
if (Test-Path $tlog) {
    $c = Get-Content -LiteralPath $tlog -Raw
    $ms = [regex]::Matches($c, "https://[a-z0-9-]+\.trycloudflare\.com")
    if ($ms.Count -gt 0) { $turl = $ms[$ms.Count - 1].Value }
}
if (-not $turl) {
    Write-Host "  sin URL de tunel para probar login. Ejecuta levantar.ps1." -ForegroundColor Yellow
} else {
    try {
        $r = Invoke-RestMethod -Uri "$turl/api/auth/login" -Method Post -ContentType "application/json; charset=utf-8" -Body $body -TimeoutSec 20
        if ($r.access_token) { Write-Host "  login OK (token recibido via tunel)" -ForegroundColor Green }
        else { Write-Host "  login respondio pero sin token" -ForegroundColor Yellow }
    } catch {
        Write-Host ("  ERROR: " + $_.Exception.Message) -ForegroundColor Red
    }
}