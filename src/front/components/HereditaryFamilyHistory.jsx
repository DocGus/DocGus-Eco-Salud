import React, { useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import MultiSelectOrOther from "./MultiSelectOrOther";

// Catálogo estático por sistema (evita recreaciones)
const HEREDITARY_SYSTEMS = Object.freeze({
    Cardiovascular: ["Hipertensión", "Cardiopatía isquémica", "Arritmias congénitas", "Insuficiencia cardiaca", "Otro"],
    Endocrino: ["Diabetes tipo 1", "Diabetes tipo 2", "Trastorno tiroideo", "Otro"],
    Renal: ["Enfermedad renal crónica", "Poliquistosis renal", "Otro"],
    Hepático: ["Enfermedad hepática crónica", "Otro"],
    Respiratorio: ["Asma", "EPOC", "Fibrosis quística", "Otro"],
    Neurológico: ["Epilepsia", "Alzheimer", "Parkinson", "Otro"],
    Hematológico: ["Anemia falciforme", "Hemofilia", "Talassemia", "Otro"],
    Oncológico: ["Cáncer de mama", "Cáncer de colon", "Cáncer de próstata", "Cáncer de pulmón", "Otro"],
});

const FAMILY_CARRIERS = Object.freeze(["Padre", "Madre", "Abuelos", "Tíos", "Hermanos", "Otros"]);

const systemOrder = Object.keys(HEREDITARY_SYSTEMS);
const diseaseIndexMap = (() => {
    const m = new Map();
    for (const [sys, list] of Object.entries(HEREDITARY_SYSTEMS)) {
        list.forEach((d, idx) => m.set(`${sys}|${d}`, idx));
    }
    return m;
})();

const sortSelections = (arr) => {
    return [...arr].sort((a, b) => {
        const ai = systemOrder.indexOf(a.system);
        const bi = systemOrder.indexOf(b.system);
        if (ai !== bi) return ai - bi;
        const ad = diseaseIndexMap.get(`${a.system}|${a.disease}`) ?? 9999;
        const bd = diseaseIndexMap.get(`${b.system}|${b.disease}`) ?? 9999;
        return ad - bd;
    });
};

const HereditaryFamilyHistory = ({ value, onChange }) => {
    const selections = Array.isArray(value) ? value : [];

    // Acceso O(1) para saber si está seleccionada y obtener datos
    const selectionMap = useMemo(() => {
        const m = new Map();
        for (const it of selections) m.set(`${it.system}|${it.disease}`, it);
        return m;
    }, [selections]);

    const toggle = useCallback((system, disease) => {
        const key = `${system}|${disease}`;
        if (selectionMap.has(key)) {
            const next = selections.filter((it) => !(it.system === system && it.disease === disease));
            onChange(sortSelections(next));
        } else {
            const next = [...selections, { system, disease, other_name: "", carriers: "" }];
            onChange(sortSelections(next));
        }
    }, [selectionMap, selections, onChange]);

    const updateField = useCallback((system, disease, field, val) => {
        const next = selections.map((it) =>
            it.system === system && it.disease === disease ? { ...it, [field]: val } : it
        );
        onChange(next);
    }, [selections, onChange]);

    return (
        <div className="mb-3 hereditary-section">
            <div className="fw-semibold mb-2">Enfermedades hereditarias por sistema</div>
            {Object.entries(HEREDITARY_SYSTEMS).map(([system, diseases]) => (
                <div key={system} className="mb-3">
                    <div className="mb-2 system-title">{system}</div>
                    <div className="row g-3">
                        {diseases.map((disease) => {
                            const id = `hered-${system}-${disease}`.replace(/\s+/g, "-");
                            const selected = selectionMap.has(`${system}|${disease}`);
                            const current = selected ? selectionMap.get(`${system}|${disease}`) : undefined;
                            return (
                                <div className="col-12 col-md-6 col-lg-4" key={disease}>
                                    <div className="form-check">
                                        <input
                                            className="form-check-input"
                                            type="checkbox"
                                            id={id}
                                            checked={selected}
                                            onChange={() => toggle(system, disease)}
                                        />
                                        <label className="form-check-label" htmlFor={id}>{disease}</label>
                                    </div>

                                    {selected && (
                                        <div className="mt-2 ps-3 border-start">
                                            {disease === "Otro" && (
                                                <div className="mb-2">
                                                    <label className="form-label">Especifica la enfermedad (Otro)</label>
                                                    <input
                                                        type="text"
                                                        className="form-control"
                                                        value={current?.other_name || ""}
                                                        onChange={(e) => updateField(system, disease, "other_name", e.target.value)}
                                                        placeholder="Ej. Síndrome de Marfan"
                                                    />
                                                </div>
                                            )}
                                            <MultiSelectOrOther
                                                label="Familiares portadores"
                                                name={`carriers-${system}-${disease}`}
                                                value={current?.carriers || ""}
                                                options={FAMILY_CARRIERS}
                                                columns={3}
                                                onChange={(name, v) => updateField(system, disease, "carriers", v)}
                                            />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
};

HereditaryFamilyHistory.propTypes = {
    value: PropTypes.arrayOf(PropTypes.shape({
        system: PropTypes.string.isRequired,
        disease: PropTypes.string.isRequired,
        other_name: PropTypes.string,
        carriers: PropTypes.string,
    })).isRequired,
    onChange: PropTypes.func.isRequired,
};

export default React.memo(HereditaryFamilyHistory);
