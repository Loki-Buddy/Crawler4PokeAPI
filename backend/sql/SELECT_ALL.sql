SET search_path TO "Pokedex";

SELECT * FROM pokemon;
SELECT * FROM typ;
SELECT * FROM pokemon_typ;

SELECT COUNT(*) FROM pokemon_typ;

SELECT 
    p.id AS pokemon_id,
    p.api_name AS pokemon_api_name,
    p.ger_name AS pokemon_ger_name,
    p.height AS pokemon_height,
    p.weight AS pokemon_weight,
    p.flavor_text AS pokemon_flavor_text,
    p.front_sprites AS pokemon_front_sprites,
    -- Typen aus Slot 1 und Slot 2 in einer Spalte kombinieren
    CASE 
        WHEN COUNT(pt.slot) = 1 THEN MAX(t.ger_name) -- Nur ein Typ vorhanden
        ELSE STRING_AGG(t.ger_name, ', ') -- Beide Typen vorhanden
    END AS typen
FROM 
    pokemon p
JOIN 
    pokemon_typ pt ON p.id = pt.pokemon_id
JOIN 
    typ t ON pt.typ_id = t.id
GROUP BY 
    p.id, p.api_name, p.ger_name, p.height, p.weight, p.flavor_text, p.front_sprites
ORDER BY 
    p.id;



