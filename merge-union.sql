INSERT INTO merge
SELECT
    'unioned',
    ST_Force_Collection(ST_Union(geom))
FROM merge
WHERE id IN ('federal', 'tribal');
