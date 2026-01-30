$headers = @{
    'Authorization' = 'Bearer sbp_b42ecc4db1f7e83591427c2f8ad4e9d515d7c4b4'
    'Content-Type' = 'application/json'
}

# Find potential universal subsidies using multiple criteria
$body = @{
    query = @"
SELECT
  id,
  title->>'fr' as title,
  agency,
  region,
  legal_entities,
  targeted_audiences,
  is_universal_sector,
  is_business_relevant,
  source_url
FROM subsidies
WHERE is_active = true
AND (deadline IS NULL OR deadline >= CURRENT_DATE)
AND region::text LIKE '%National%'
-- Has business in targeted_audiences
AND (
  targeted_audiences::text ILIKE '%business%'
  OR legal_entities::text ILIKE '%entreprise%'
)
-- No size restrictions in legal_entities
AND (legal_entities IS NULL OR NOT (
  legal_entities::text ILIKE '%PME%'
  OR legal_entities::text ILIKE '%TPE%'
  OR legal_entities::text ILIKE '%ETI%'
))
-- Not already marked as universal
AND is_universal_sector = false
-- Is business relevant
AND (is_business_relevant IS NULL OR is_business_relevant = true)
ORDER BY agency
LIMIT 30
"@
} | ConvertTo-Json
$r = Invoke-RestMethod -Uri 'https://api.supabase.com/v1/projects/gvfgvbztagafjykncwto/database/query' -Method POST -Headers $headers -Body $body
Write-Host "=== Potential universal subsidies (national, business, no size restriction) ==="
Write-Host "Count:" $r.Count
$r | ConvertTo-Json -Depth 5

# Check what values exist in is_business_relevant
$body = @{
    query = @"
SELECT is_business_relevant, COUNT(*) as count
FROM subsidies
WHERE is_active = true
GROUP BY is_business_relevant
ORDER BY count DESC
"@
} | ConvertTo-Json
$r = Invoke-RestMethod -Uri 'https://api.supabase.com/v1/projects/gvfgvbztagafjykncwto/database/query' -Method POST -Headers $headers -Body $body
Write-Host "`n=== is_business_relevant distribution ==="
$r | ConvertTo-Json
