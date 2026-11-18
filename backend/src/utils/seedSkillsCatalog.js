const pool = require("../db");

const SKILLS_CATALOG = [
    // Administración y Finanzas
    { name: "Contabilidad General", category: "Administración y Finanzas" },
    { name: "Análisis Financiero", category: "Administración y Finanzas" },
    { name: "Facturación y Cobranzas", category: "Administración y Finanzas" },
    { name: "Gestión de Presupuestos", category: "Administración y Finanzas" },
    { name: "Nómina y Liquidación", category: "Administración y Finanzas" },
    { name: "Auditoría Financiera", category: "Administración y Finanzas" },
    { name: "Excel Avanzado", category: "Administración y Finanzas" },
    { name: "Impuestos y Tributación", category: "Administración y Finanzas" },
    { name: "Gestión de Tesorería", category: "Administración y Finanzas" },

    // Ventas y Comercial
    { name: "Negociación Comercial", category: "Ventas y Comercial" },
    { name: "Prospección de Clientes", category: "Ventas y Comercial" },
    { name: "Cierre de Ventas", category: "Ventas y Comercial" },
    { name: "Gestión de Cuentas (KAM)", category: "Ventas y Comercial" },
    { name: "Manejo de CRM", category: "Ventas y Comercial" },
    { name: "Venta B2B Corporativa", category: "Ventas y Comercial" },
    { name: "Venta B2C y Mostrador", category: "Ventas y Comercial" },
    { name: "Telemercadeo", category: "Ventas y Comercial" },
    { name: "Fidelización de Clientes", category: "Ventas y Comercial" },

    // Marketing y Comunicación
    { name: "Marketing Digital", category: "Marketing y Comunicación" },
    { name: "Community Management", category: "Marketing y Comunicación" },
    { name: "Creación de Contenido (Copywriting)", category: "Marketing y Comunicación" },
    { name: "SEO / SEM", category: "Marketing y Comunicación" },
    { name: "Publicidad Digital (Ads)", category: "Marketing y Comunicación" },
    { name: "Email Marketing", category: "Marketing y Comunicación" },
    { name: "Relaciones Públicas", category: "Marketing y Comunicación" },
    { name: "Analítica Web", category: "Marketing y Comunicación" },
    { name: "Branding y Gestión de Marca", category: "Marketing y Comunicación" },

    // Recursos Humanos y Talento
    { name: "Reclutamiento y Selección", category: "Recursos Humanos y Talento" },
    { name: "Gestión del Talento Humano", category: "Recursos Humanos y Talento" },
    { name: "Clima y Cultura Organizacional", category: "Recursos Humanos y Talento" },
    { name: "Capacitación y Desarrollo", category: "Recursos Humanos y Talento" },
    { name: "Legislación Laboral", category: "Recursos Humanos y Talento" },
    { name: "Evaluación del Desempeño", category: "Recursos Humanos y Talento" },
    { name: "Bienestar y Compensaciones", category: "Recursos Humanos y Talento" },

    // Operaciones y Logística
    { name: "Gestión de Inventarios", category: "Operaciones y Logística" },
    { name: "Cadena de Suministro (Supply Chain)", category: "Operaciones y Logística" },
    { name: "Logística y Distribución", category: "Operaciones y Logística" },
    { name: "Gestión de Almacén y Bodega", category: "Operaciones y Logística" },
    { name: "Compras y Negociación con Proveedores", category: "Operaciones y Logística" },
    { name: "Control de Calidad Operativa", category: "Operaciones y Logística" },
    { name: "Despacho y Transporte", category: "Operaciones y Logística" },
    { name: "Mejora de Procesos (Lean)", category: "Operaciones y Logística" },

    // Servicio al Cliente y Soporte
    { name: "Atención y Servicio al Cliente", category: "Servicio al Cliente y Soporte" },
    { name: "Gestión de PQR", category: "Servicio al Cliente y Soporte" },
    { name: "Manejo de Contact Center", category: "Servicio al Cliente y Soporte" },
    { name: "Comunicación Asertiva", category: "Servicio al Cliente y Soporte" },
    { name: "Resolución de Conflictos", category: "Servicio al Cliente y Soporte" },
    { name: "Experiencia del Cliente (CX)", category: "Servicio al Cliente y Soporte" },
    { name: "Soporte Técnico al Usuario", category: "Servicio al Cliente y Soporte" },
    { name: "Soporte técnico", category: "Servicio al Cliente y Soporte" },

    // Salud y Bienestar
    { name: "Primeros Auxilios", category: "Salud y Bienestar" },
    { name: "Enfermería y Cuidados Clínicos", category: "Salud y Bienestar" },
    { name: "Seguridad y Salud en el Trabajo (SST)", category: "Salud y Bienestar" },
    { name: "Psicología Organizacional", category: "Salud y Bienestar" },
    { name: "Nutrición y Dietética", category: "Salud y Bienestar" },
    { name: "Fisioterapia y Ergonomía", category: "Salud y Bienestar" },
    { name: "Gestión de Historias Clínicas", category: "Salud y Bienestar" },

    // Educación y Formación
    { name: "Pedagogía y Docencia", category: "Educación y Formación" },
    { name: "Diseño Instruccional", category: "Educación y Formación" },
    { name: "Plataformas E-Learning", category: "Educación y Formación" },
    { name: "Tutoría y Asesoría Académica", category: "Educación y Formación" },
    { name: "Creación de Material Didáctico", category: "Educación y Formación" },
    { name: "Evaluación del Aprendizaje", category: "Educación y Formación" },

    // Legal y Cumplimiento
    { name: "Derecho Laboral y Contratos", category: "Legal y Cumplimiento" },
    { name: "Cumplimiento Normativo (Compliance)", category: "Legal y Cumplimiento" },
    { name: "Redacción Jurídica", category: "Legal y Cumplimiento" },
    { name: "Protección de Datos Personales", category: "Legal y Cumplimiento" },
    { name: "Gestión de Licitaciones", category: "Legal y Cumplimiento" },

    // Diseño y Creatividad
    { name: "Diseño Gráfico", category: "Diseño y Creatividad" },
    { name: "Diseño UX/UI", category: "Diseño y Creatividad" },
    { name: "UX/UI", category: "Diseño y Creatividad" },
    { name: "Figma", category: "Diseño y Creatividad" },
    { name: "Adobe Photoshop", category: "Diseño y Creatividad" },
    { name: "Adobe Illustrator", category: "Diseño y Creatividad" },
    { name: "Edición de Video", category: "Diseño y Creatividad" },
    { name: "Prototipado", category: "Diseño y Creatividad" },
    { name: "Fotografía y Dirección de Arte", category: "Diseño y Creatividad" },
    { name: "Pruebas con usuarios", category: "Diseño y Creatividad" },

    // Tecnología y Software
    { name: "JavaScript", category: "Tecnología y Software" },
    { name: "Python", category: "Tecnología y Software" },
    { name: "Java", category: "Tecnología y Software" },
    { name: "React", category: "Tecnología y Software" },
    { name: "Next.js", category: "Tecnología y Software" },
    { name: "Node.js", category: "Tecnología y Software" },
    { name: "Express", category: "Tecnología y Software" },
    { name: "PostgreSQL", category: "Tecnología y Software" },
    { name: "SQL", category: "Tecnología y Software" },
    { name: "API REST", category: "Tecnología y Software" },
    { name: "Git", category: "Tecnología y Software" },
    { name: "Docker", category: "Tecnología y Software" },
    { name: "Desarrollo Móvil", category: "Tecnología y Software" },
    { name: "Flutter", category: "Tecnología y Software" },
    { name: "React Native", category: "Tecnología y Software" },
    { name: "Machine Learning", category: "Tecnología y Software" },
    { name: "ETL", category: "Tecnología y Software" },
    { name: "Modelado de datos", category: "Tecnología y Software" },
    { name: "Automatización de pruebas", category: "Tecnología y Software" },
    { name: "Playwright", category: "Tecnología y Software" },
    { name: "QA Automation", category: "Tecnología y Software" },
    { name: "Ciberseguridad y Redes", category: "Tecnología y Software" },
    { name: "Soporte TI", category: "Tecnología y Software" },
    { name: "Redes", category: "Tecnología y Software" },
    { name: "Programación básica", category: "Tecnología y Software" },

    // Idiomas y Habilidades Profesionales
    { name: "Inglés Intermedio / Avanzado", category: "Idiomas y Habilidades Profesionales" },
    { name: "Liderazgo de Equipos", category: "Idiomas y Habilidades Profesionales" },
    { name: "Trabajo en Equipo", category: "Idiomas y Habilidades Profesionales" },
    { name: "Gestión del Tiempo", category: "Idiomas y Habilidades Profesionales" },
    { name: "Pensamiento Crítico", category: "Idiomas y Habilidades Profesionales" }
];

async function seedSkills(client = pool) {
    try {
        // 1. Limpieza de nombres con problemas de codificación previa en la BD
        const cleanupMap = [
            { bad: "Dise¤o UX/UI", good: "Diseño UX/UI", category: "Diseño y Creatividad" },
            { bad: "Dise?o UX/UI", good: "Diseño UX/UI", category: "Diseño y Creatividad" },
            { bad: "Automatizaci¢n de pruebas", good: "Automatización de pruebas", category: "Tecnología y Software" },
            { bad: "Soporte t‚cnico", good: "Soporte Técnico al Usuario", category: "Servicio al Cliente y Soporte" },
            { bad: "Desarrollo m¢vil", good: "Desarrollo Móvil", category: "Tecnología y Software" },
            { bad: "Programaci¢n b sica", good: "Programación básica", category: "Tecnología y Software" }
        ];

        for (const item of cleanupMap) {
            const badRow = await client.query("SELECT id FROM skills WHERE name = $1", [item.bad]);
            if (badRow.rows[0]) {
                const badId = badRow.rows[0].id;
                const goodRow = await client.query("SELECT id FROM skills WHERE name = $1", [item.good]);
                if (goodRow.rows[0]) {
                    const goodId = goodRow.rows[0].id;
                    // Mover referencias de perfil y oferta al id correcto
                    await client.query("UPDATE profile_skills SET skill_id = $1 WHERE skill_id = $2 ON CONFLICT DO NOTHING", [goodId, badId]);
                    await client.query("DELETE FROM profile_skills WHERE skill_id = $1", [badId]);

                    await client.query("UPDATE offer_skills SET skill_id = $1 WHERE skill_id = $2 ON CONFLICT DO NOTHING", [goodId, badId]);
                    await client.query("DELETE FROM offer_skills WHERE skill_id = $1", [badId]);

                    await client.query("DELETE FROM skills WHERE id = $1", [badId]);
                } else {
                    await client.query("UPDATE skills SET name = $1, category = $2 WHERE id = $3", [item.good, item.category, badId]);
                }
            }
        }

        // 2. Insertar o actualizar todas las habilidades del catálogo con su categoría correspondiente
        for (const skill of SKILLS_CATALOG) {
            await client.query(
                `INSERT INTO skills (name, category)
                 VALUES ($1, $2)
                 ON CONFLICT (name) DO UPDATE SET category = EXCLUDED.category`,
                [skill.name, skill.category]
            );
        }

        console.log(`Catálogo de habilidades precargado con éxito: ${SKILLS_CATALOG.length} habilidades.`);
    } catch (error) {
        console.error("Error al precargar el catálogo de habilidades:", error);
    }
}

module.exports = {
    SKILLS_CATALOG,
    seedSkills
};
