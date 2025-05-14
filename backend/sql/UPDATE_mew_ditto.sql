SET search_path TO "BattleMechanic";

-- 1. IDs ermitteln
WITH poke_ids AS (
    SELECT id FROM pokemon WHERE api_name IN ('mew', 'ditto')
),
move_id AS (
    SELECT id FROM moves WHERE api_name = 'transform'
)
-- 2. Move zu moves_arr hinzufügen (nur wenn noch nicht enthalten)
UPDATE pokemon_moves
SET moves_arr = array_append(moves_arr, (SELECT id FROM move_id))
WHERE pokemon_id IN (SELECT id FROM poke_ids)
  AND NOT (moves_arr @> ARRAY[(SELECT id FROM move_id)]);