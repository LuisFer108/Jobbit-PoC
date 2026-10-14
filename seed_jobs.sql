-- seed_jobs.sql — Datos de prueba para SCRUM-13 (mostrar vacantes)
-- Ejecutar DESPUÉS de db.sql:  psql -d job_portal -f seed_jobs.sql

-- Fuente simulada de vacantes (diagrama de clases: FuenteOfertasSimuladas)
INSERT INTO offer_sources (name, type)
VALUES ('Dataset inicial Jobbit', 'dataset')
ON CONFLICT DO NOTHING;

-- 10 vacantes de ejemplo (todas 'active'; created_by NULL porque vienen del dataset)
INSERT INTO job_offers (source_id, created_by, title, company, description, min_experience_years, location, work_mode, salary_range, status)
VALUES
((SELECT id FROM offer_sources WHERE name='Dataset inicial Jobbit'), NULL,
 'Desarrollador Backend Node.js', 'TechBogotá SAS',
 'Buscamos una persona para construir y mantener APIs REST con Node.js y PostgreSQL. Trabajarás en un equipo ágil con buen ambiente.',
 2, 'Bogotá', 'hybrid', '2M - 5M', 'active'),

((SELECT id FROM offer_sources WHERE name='Dataset inicial Jobbit'), NULL,
 'Desarrollador Frontend React', 'Pixela Studio',
 'Únete a crear interfaces modernas con React y Next.js. Nos importa el detalle y la buena experiencia de usuario.',
 1, 'Medellín', 'remote', '2M - 5M', 'active'),

((SELECT id FROM offer_sources WHERE name='Dataset inicial Jobbit'), NULL,
 'Ingeniero de Datos Junior', 'DataAndes',
 'Apoya la limpieza y el modelado de datos para nuestros tableros. Ideal si te gustan los números y SQL.',
 1, 'Cali', 'onsite', '2M - 5M', 'active'),

((SELECT id FROM offer_sources WHERE name='Dataset inicial Jobbit'), NULL,
 'Diseñador UX/UI', 'Naranja Digital',
 'Diseña productos digitales fáciles y bonitos. Harás prototipos y pruebas con usuarios reales.',
 2, 'Remoto Colombia', 'remote', '2M - 5M', 'active'),

((SELECT id FROM offer_sources WHERE name='Dataset inicial Jobbit'), NULL,
 'QA Automation', 'Soft Caribe',
 'Automatiza pruebas para que todo salga perfecto antes de llegar a producción. Trabajamos con Playwright.',
 2, 'Barranquilla', 'hybrid', '2M - 5M', 'active'),

((SELECT id FROM offer_sources WHERE name='Dataset inicial Jobbit'), NULL,
 'Desarrollador Fullstack', 'Montaña Labs',
 'Trabaja de punta a punta: frontend, backend y base de datos. Buen plan para crecer rápido.',
 3, 'Bogotá', 'hybrid', 'Más de 5M', 'active'),

((SELECT id FROM offer_sources WHERE name='Dataset inicial Jobbit'), NULL,
 'Analista de Soporte TI', 'ConectaCo',
 'Ayuda a nuestros clientes a resolver dudas técnicas con paciencia y buena actitud.',
 0, 'Bucaramanga', 'onsite', 'Menos de 2M', 'active'),

((SELECT id FROM offer_sources WHERE name='Dataset inicial Jobbit'), NULL,
 'Científico de Datos', 'Insight Colombia',
 'Construye modelos y encuentra historias en los datos. Python y curiosidad son clave.',
 3, 'Medellín', 'remote', 'Más de 5M', 'active'),

((SELECT id FROM offer_sources WHERE name='Dataset inicial Jobbit'), NULL,
 'Desarrollador Móvil', 'AppValle',
 'Crea apps que la gente ama usar. Trabajamos con tecnologías modernas y entregas frecuentes.',
 2, 'Cali', 'hybrid', '2M - 5M', 'active'),

((SELECT id FROM offer_sources WHERE name='Dataset inicial Jobbit'), NULL,
 'Practicante de Desarrollo', 'Semilla Tech',
 'Primera experiencia laboral acompañada por un mentor. Perfecto si estás empezando.',
 0, 'Remoto Colombia', 'remote', 'Menos de 2M', 'active');
