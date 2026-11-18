"use client";

import { useState, useMemo } from "react";
import styles from "./SkillSelector.module.css";

/**
 * Componente modular para selección de habilidades multirubro y categorizadas.
 * Permite filtrar por pestañas de categoría, buscar en tiempo real,
 * visualizar de un vistazo las habilidades seleccionadas y respetar límites.
 */
export default function SkillSelector({
    catalog = [],
    selectedSkills = [],
    onToggleSkill,
    maxSkills = 5,
    title = "Habilidades profesionales",
    subtitle = "Selecciona tus habilidades clave para encontrar las mejores oportunidades laborales",
    showLimitNotice = true
}) {
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [limitNotice, setLimitNotice] = useState("");

    // Obtener lista única y ordenada de categorías
    const categories = useMemo(() => {
        const set = new Set();
        catalog.forEach((s) => {
            if (s.category) set.add(s.category);
        });
        return Array.from(set).sort();
    }, [catalog]);

    // Mapeo de seleccionadas por categoría para mostrar indicadores
    const selectedCountByCategory = useMemo(() => {
        const counts = {};
        const selectedIdSet = new Set(selectedSkills);
        catalog.forEach((s) => {
            if (selectedIdSet.has(s.id)) {
                counts[s.category] = (counts[s.category] || 0) + 1;
            }
        });
        return counts;
    }, [catalog, selectedSkills]);

    // Habilidades seleccionadas como objetos completos
    const selectedObjects = useMemo(() => {
        const map = new Map(catalog.map((s) => [s.id, s]));
        return selectedSkills.map((id) => map.get(id)).filter(Boolean);
    }, [catalog, selectedSkills]);

    // Filtrar habilidades por categoría y término de búsqueda
    const filteredSkills = useMemo(() => {
        const term = searchTerm.toLowerCase().trim();
        return catalog.filter((s) => {
            const matchesCategory =
                selectedCategory === "all" || s.category === selectedCategory;
            const matchesSearch =
                !term ||
                s.name.toLowerCase().includes(term) ||
                (s.category && s.category.toLowerCase().includes(term));
            return matchesCategory && matchesSearch;
        });
    }, [catalog, selectedCategory, searchTerm]);

    // Agrupar habilidades filtradas por categoría para visualización clara
    const groupedSkills = useMemo(() => {
        const groups = {};
        filteredSkills.forEach((s) => {
            const cat = s.category || "Otras";
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(s);
        });
        return groups;
    }, [filteredSkills]);

    function handleToggle(id) {
        setLimitNotice("");
        const isSelected = selectedSkills.includes(id);

        if (!isSelected && maxSkills && selectedSkills.length >= maxSkills) {
            setLimitNotice(
                `Solo puedes seleccionar un máximo de ${maxSkills} habilidades. Deselecciona una para agregar otra.`
            );
            return;
        }

        if (typeof onToggleSkill === "function") {
            onToggleSkill(id);
        }
    }

    return (
        <div className={styles.container}>
            {/* Cabecera y contador */}
            <div className={styles.header}>
                <div className={styles.titleGroup}>
                    {title && <span className={styles.title}>{title}</span>}
                    {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
                </div>
                {maxSkills ? (
                    <span
                        className={`${styles.counter} ${
                            selectedSkills.length >= maxSkills ? styles.counterLimit : ""
                        }`}
                    >
                        {selectedSkills.length}/{maxSkills} seleccionadas
                    </span>
                ) : (
                    <span className={styles.counter}>
                        {selectedSkills.length} seleccionada(s)
                    </span>
                )}
            </div>

            {/* Aviso de límite */}
            {limitNotice && showLimitNotice && (
                <div className={styles.feedbackAlert} role="alert">
                    ⚠️ {limitNotice}
                </div>
            )}

            {/* Franja de habilidades seleccionadas */}
            {selectedObjects.length > 0 && (
                <div className={styles.selectedStrip}>
                    <span className={styles.selectedStripLabel}>Tus seleccionadas:</span>
                    {selectedObjects.map((s) => (
                        <button
                            key={s.id}
                            type="button"
                            onClick={() => handleToggle(s.id)}
                            className={styles.selectedBadge}
                            title="Haz clic para quitar"
                        >
                            <span>✓ {s.name}</span>
                            <span className={styles.removeIcon} aria-hidden="true">✕</span>
                        </button>
                    ))}
                </div>
            )}

            {/* Buscador de habilidades */}
            <div className={styles.searchWrapper}>
                <span className={styles.searchIcon} aria-hidden="true">🔍</span>
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar habilidad (ej: Ventas, Excel, React, Nómina, Liderazgo)..."
                    className={styles.searchInput}
                    aria-label="Buscar habilidad"
                />
                {searchTerm && (
                    <button
                        type="button"
                        onClick={() => setSearchTerm("")}
                        className={styles.clearSearchBtn}
                        aria-label="Limpiar búsqueda"
                    >
                        ✕
                    </button>
                )}
            </div>

            {/* Pestañas de categorías multirubro */}
            <div className={styles.categoriesBar} role="tablist" aria-label="Categorías de habilidades">
                <button
                    type="button"
                    role="tab"
                    aria-selected={selectedCategory === "all"}
                    onClick={() => setSelectedCategory("all")}
                    className={`${styles.categoryTab} ${
                        selectedCategory === "all" ? styles.categoryTabActive : ""
                    }`}
                >
                    Todas las categorías
                    <span className={styles.categoryBadge}>{catalog.length}</span>
                </button>

                {categories.map((cat) => {
                    const selCount = selectedCountByCategory[cat] || 0;
                    return (
                        <button
                            key={cat}
                            type="button"
                            role="tab"
                            aria-selected={selectedCategory === cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`${styles.categoryTab} ${
                                selectedCategory === cat ? styles.categoryTabActive : ""
                            }`}
                        >
                            {cat}
                            {selCount > 0 && (
                                <span className={styles.categoryBadge} title={`${selCount} seleccionadas en esta categoría`}>
                                    {selCount}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Catálogo de habilidades agrupadas o filtradas */}
            <div className={styles.groupsContainer}>
                {Object.keys(groupedSkills).length === 0 ? (
                    <div className={styles.emptyResults}>
                        No encontramos habilidades que coincidan con &quot;{searchTerm}&quot; en esta categoría.
                    </div>
                ) : (
                    Object.entries(groupedSkills).map(([catName, skills]) => (
                        <div key={catName} className={styles.categoryGroup}>
                            {selectedCategory === "all" && (
                                <div className={styles.groupHeader}>
                                    <span>{catName}</span>
                                    <span className={styles.groupCount}>({skills.length})</span>
                                </div>
                            )}
                            <div className={styles.skillsGrid}>
                                {skills.map((s) => {
                                    const isSelected = selectedSkills.includes(s.id);
                                    return (
                                        <button
                                            key={s.id}
                                            type="button"
                                            onClick={() => handleToggle(s.id)}
                                            className={`${styles.skillChip} ${
                                                isSelected ? styles.skillChipSelected : ""
                                            }`}
                                            aria-pressed={isSelected}
                                        >
                                            <span aria-hidden="true">
                                                {isSelected ? "✓ " : "+ "}
                                            </span>
                                            {s.name}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
