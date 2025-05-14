SET search_path TO "BattleMechanic";

SELECT
    p.id AS pokemon_id,
    p.api_name AS pokemon_api_name,
    p.ger_name AS pokemon_ger_name,
    p.front_sprite,
    p.back_sprite,
    p.cry_url,
    p.hp,
    p.attack,
    p.special_attack,
    p.defense,
    p.special_defense,
    p.speed,
    ARRAY_AGG(DISTINCT t.api_name) AS typen_api,
    ARRAY_AGG(DISTINCT t.ger_name) AS typen_ger,
    ARRAY_AGG(DISTINCT weak_val) AS schwächen,
    ARRAY_AGG(DISTINCT strong_val) AS stärken,
    ARRAY_AGG(DISTINCT m.api_name) AS moves_api,
    ARRAY_AGG(DISTINCT m.ger_name) AS moves_ger
FROM
    pokemon p
LEFT JOIN
    pokemon_typ pt ON p.id = pt.pokemon_id
LEFT JOIN
    typ t ON pt.typ_id = t.id
LEFT JOIN
    pokemon_weak_strong pws ON t.id = pws.typ_id
LEFT JOIN LATERAL
    UNNEST(pws.weak) AS weak_val ON TRUE
LEFT JOIN LATERAL
    UNNEST(pws.strong) AS strong_val ON TRUE
LEFT JOIN
    pokemon_moves pm ON p.id = pm.pokemon_id
LEFT JOIN
    moves m ON pm.moves_arr IS NOT NULL AND m.id = ANY(pm.moves_arr)
GROUP BY
    p.id
ORDER BY
    p.id;