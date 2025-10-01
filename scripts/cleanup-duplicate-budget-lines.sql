-- Clean up duplicate budget_lines
-- This script removes duplicate budget lines for the same budget_id and category_id
-- keeping only the most recent one (highest id)

DELETE FROM budget_lines
WHERE id NOT IN (
  SELECT MAX(id)
  FROM budget_lines
  GROUP BY budget_id, category_id
);

-- Verify the cleanup
SELECT
  budget_id,
  category_id,
  COUNT(*) as count
FROM budget_lines
GROUP BY budget_id, category_id
HAVING COUNT(*) > 1;

-- Should return no rows if cleanup was successful
