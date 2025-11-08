Param(
  [string]$ClusterHost
)

function Write-Heading($text){
  Write-Host "\n=== $text ===" -ForegroundColor Cyan
}

if (-not $ClusterHost) {
  if (Test-Path ".env") {
    $envContent = Get-Content .env | Out-String
    if ($envContent -match "MONGODB_URI=(.+)") {
      $uri = $Matches[1].Trim()
      if ($uri -match "mongodb\+srv://(?:[^@]+@)?([^/]+)") {
        $ClusterHost = $Matches[1]
      }
    }
  }
}

if (-not $ClusterHost) {
  $ClusterHost = Read-Host 'Enter the Atlas cluster host (e.g. iamrhyno.sato79q.mongodb.net)'
}

Write-Heading "Input host"
Write-Host $ClusterHost

# SRV lookup
Write-Heading "SRV lookup (Resolve-DnsName -Type SRV)"
try {
  Resolve-DnsName $ClusterHost -Type SRV -ErrorAction Stop | Format-Table -AutoSize
} catch {
  Write-Host "SRV lookup failed: $_" -ForegroundColor Yellow
}

# TXT lookup
Write-Heading "TXT lookup (Resolve-DnsName -Type TXT)"
try {
  Resolve-DnsName $ClusterHost -Type TXT -ErrorAction Stop | Format-Table -AutoSize
} catch {
  Write-Host "TXT lookup failed: $_" -ForegroundColor Yellow
}

# nslookup SRV
Write-Heading "nslookup -type=SRV"
nslookup -type=SRV $ClusterHost

# Test connection to common MongoDB port 27017
Write-Heading "Test-NetConnection (port 27017)"
Test-NetConnection -ComputerName $ClusterHost -Port 27017 | Format-List

# Test connection to TLS port 443 as Atlas may use TLS through 443
Write-Heading "Test-NetConnection (port 443)"
Test-NetConnection -ComputerName $ClusterHost -Port 443 | Format-List

Write-Heading "Notes"
Write-Host "If SRV or TXT lookups fail (ETIMEOUT), DNS resolution is blocked or failing. Try switching to a different DNS resolver (e.g. 8.8.8.8) or use Atlas's non-SRV connection string and update MONGODB_URI. Also ensure your IP is whitelisted in Atlas Network Access." -ForegroundColor Green
