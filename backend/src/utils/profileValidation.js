/**
 * Validador para determinar si el perfil laboral de un candidato está completo
 * antes de permitir una postulación asistida.
 */
function validateWorkProfileCompleteness(profile) {
    if (!profile) {
        return {
            isComplete: false,
            missingFields: [
                "campo profesional",
                "años de experiencia",
                "experiencia",
                "educación"
            ]
        };
    }

    const missingFields = [];

    if (!profile.field || !String(profile.field).trim()) {
        missingFields.push("campo profesional");
    }

    const years = profile.experience_years;
    if (
        years === null ||
        years === undefined ||
        years === "" ||
        isNaN(Number(years)) ||
        Number(years) < 0
    ) {
        missingFields.push("años de experiencia");
    }

    if (!profile.experience || !String(profile.experience).trim()) {
        missingFields.push("experiencia");
    }

    if (!profile.education || !String(profile.education).trim()) {
        missingFields.push("educación");
    }

    return {
        isComplete: missingFields.length === 0,
        missingFields
    };
}

module.exports = {
    validateWorkProfileCompleteness
};
