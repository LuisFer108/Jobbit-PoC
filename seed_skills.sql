-- seed_skills.sql: habilidades y su relación con las vacantes de seed_jobs.sql
-- Ejecutar DESPUÉS de db.sql y seed_jobs.sql. Se puede correr más de una vez.

INSERT INTO skills (name, category) VALUES
('Node.js', 'Técnica'),
('PostgreSQL', 'Técnica'),
('API REST', 'Técnica'),
('React', 'Técnica'),
('Next.js', 'Técnica'),
('SQL', 'Datos'),
('Modelado de datos', 'Datos'),
('Python', 'Datos'),
('Machine Learning', 'Datos'),
('Diseño UX/UI', 'Diseño'),
('Prototipado', 'Diseño'),
('Pruebas con usuarios', 'Diseño'),
('Playwright', 'Calidad'),
('Automatización de pruebas', 'Calidad'),
('Soporte técnico', 'Soporte'),
('Desarrollo móvil', 'Técnica'),
('Programación básica', 'Técnica')
ON CONFLICT (name) DO NOTHING;

-- requirement: must = obligatoria (peso 2), nice = deseable (peso 1)
INSERT INTO offer_skills (offer_id, skill_id, requirement, weight)
SELECT o.id, s.id, v.req, v.w
FROM (VALUES
  ('Desarrollador Backend Node.js', 'Node.js', 'must', 2),
  ('Desarrollador Backend Node.js', 'PostgreSQL', 'must', 2),
  ('Desarrollador Backend Node.js', 'API REST', 'must', 2),

  ('Desarrollador Frontend React', 'React', 'must', 2),
  ('Desarrollador Frontend React', 'Next.js', 'must', 2),

  ('Ingeniero de Datos Junior', 'SQL', 'must', 2),
  ('Ingeniero de Datos Junior', 'Modelado de datos', 'must', 2),

  ('Diseñador UX/UI', 'Diseño UX/UI', 'must', 2),
  ('Diseñador UX/UI', 'Prototipado', 'must', 2),
  ('Diseñador UX/UI', 'Pruebas con usuarios', 'must', 2),

  ('QA Automation', 'Playwright', 'must', 2),
  ('QA Automation', 'Automatización de pruebas', 'must', 2),

  ('Desarrollador Fullstack', 'React', 'must', 2),
  ('Desarrollador Fullstack', 'Node.js', 'must', 2),
  ('Desarrollador Fullstack', 'PostgreSQL', 'must', 2),

  ('Analista de Soporte TI', 'Soporte técnico', 'must', 2),

  ('Científico de Datos', 'Python', 'must', 2),
  ('Científico de Datos', 'Machine Learning', 'nice', 1),
  ('Científico de Datos', 'SQL', 'nice', 1),

  ('Desarrollador Móvil', 'Desarrollo móvil', 'must', 2),

  ('Practicante de Desarrollo', 'Programación básica', 'nice', 1)
) AS v(title, skill, req, w)
JOIN job_offers o ON o.title = v.title
JOIN skills s ON s.name = v.skill
ON CONFLICT (offer_id, skill_id) DO NOTHING;

-- Verificación: cuántas habilidades quedó pidiendo cada vacante
SELECT o.id, o.title, COUNT(os.skill_id) AS habilidades
FROM job_offers o
LEFT JOIN offer_skills os ON os.offer_id = o.id
GROUP BY o.id, o.title
ORDER BY o.id;