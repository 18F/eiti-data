DELETE FROM merge WHERE id = 'buffered';
INSERT INTO merge
SELECT
    'buffered',
    ST_Force_Collection(ST_Buffer(geom, 500))
FROM merge
WHERE id = 'unioned';
