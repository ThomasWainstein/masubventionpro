-- Check what subsidies would match France Bamboo in real DB
-- Run this in Supabase SQL editor

-- 1. Count total active subsidies
SELECT COUNT(*) as total_active 
FROM subsidies 
WHERE is_active = true AND is_business_relevant = true;

-- 2. Agriculture subsidies in Occitanie
SELECT id, title, primary_sector, region, amount_max
FROM subsidies 
WHERE is_active = true 
  AND is_business_relevant = true
  AND (primary_sector ILIKE '%agriculture%' OR primary_sector ILIKE '%agri%')
  AND (region @> '{"Occitanie"}' OR region @> '{"National"}')
ORDER BY amount_max DESC NULLS LAST
LIMIT 20;

-- 3. Check for bio/organic specific subsidies
SELECT id, title, primary_sector, keywords
FROM subsidies 
WHERE is_active = true 
  AND is_business_relevant = true
  AND (
    title ILIKE '%bio%' 
    OR title ILIKE '%biologique%'
    OR description::text ILIKE '%agriculture biologique%'
    OR keywords @> '["bio"]'
    OR keywords @> '["biologique"]'
  )
LIMIT 10;

-- 4. Check for construction/matériaux subsidies (bamboo is for construction)
SELECT id, title, primary_sector
FROM subsidies 
WHERE is_active = true 
  AND (
    title ILIKE '%matériau%' 
    OR title ILIKE '%construction%'
    OR title ILIKE '%biosourcé%'
    OR description::text ILIKE '%matériaux biosourcés%'
  )
LIMIT 10;

-- 5. Check for innovation subsidies (France Bamboo has innovation projects)
SELECT id, title, primary_sector, region
FROM subsidies 
WHERE is_active = true 
  AND is_business_relevant = true
  AND (title ILIKE '%innovation%' OR keywords @> '["innovation"]')
  AND (region @> '{"Occitanie"}' OR region @> '{"National"}')
LIMIT 10;
