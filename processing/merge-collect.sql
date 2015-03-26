DROP TABLE IF EXISTS merge;
CREATE TABLE merge (
    id      VARCHAR(32) PRIMARY KEY,
    geom    geometry(GeometryCollection)
);

INSERT INTO merge SELECT 'federal', ST_Collect(geom) FROM fedland;
INSERT INTO merge SELECT 'tribal', ST_Collect(geom) FROM tribal;

CREATE INDEX gist ON merge USING GIST (geom);
