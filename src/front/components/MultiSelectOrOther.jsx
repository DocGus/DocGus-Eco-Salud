import React, { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";

// Normaliza opciones permitiendo strings o {value,label}
const normalizeOptions = (opts) =>
    (opts || []).map((opt) =>
        typeof opt === "string" ? { value: opt, label: opt } : { value: opt.value, label: opt.label }
    );

// Convierte string "a, b, c" <-> array ["a","b","c"]
const splitValue = (value, delimiter) =>
    (value || "")
        .split(delimiter)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

const joinValue = (arr, delimiter) => (arr || []).filter(Boolean).join(delimiter);

const MultiSelectOrOther = ({
    label,
    name,
    value,
    options,
    onChange,
    includeOtherChoice = true,
    delimiter = ", ",
    inline = false,
    columns = 1
}) => {
    const normalized = useMemo(() => normalizeOptions(options), [options]);
    const initialSelected = useMemo(() => splitValue(value, delimiter), [value, delimiter]);
    const [selected, setSelected] = useState(initialSelected);
    const [otherOpen, setOtherOpen] = useState(false);
    const [otherValue, setOtherValue] = useState("");

    // Mantener el estado sincronizado si el padre cambia 'value'
    useEffect(() => {
        setSelected(initialSelected);
    }, [initialSelected]);

    const emit = (next) => onChange(name, joinValue(next, delimiter));

    // (handler select múltiple original no se utiliza con checkboxes; se deja comentado por si se requiere volver)
    // const handleSelectChange = (e) => {
    //     const selectedOptions = Array.from(e.target.selectedOptions).map((o) => o.value);
    //     const hasOther = selectedOptions.includes("__other__");
    //     const clean = selectedOptions.filter((v) => v !== "__other__");
    //     setSelected(clean);
    //     setOtherOpen(includeOtherChoice && hasOther);
    //     if (!hasOther) emit(clean);
    // };

    const addOther = () => {
        let v = otherValue.trim();
        if (!v) return;
        // Sanitizar comas para no romper el delimitador ", "
        v = v.replace(/[,]+/g, " ").replace(/\s+/g, " ").trim();
        if (!selected.includes(v)) {
            const next = [...selected, v];
            setSelected(next);
            emit(next);
        }
        setOtherValue("");
        setOtherOpen(false);
    };

    const removeItem = (val) => {
        const next = selected.filter((s) => s !== val);
        setSelected(next);
        emit(next);
    };

    const cols = Math.max(1, Math.min(6, Number(columns) || 1));
    const isGrid = cols > 1;
    const listContainerClass = isGrid
        ? `row row-cols-${cols} g-2`
        : inline
            ? "d-flex flex-wrap gap-3 align-items-center"
            : "d-flex flex-column gap-1";
    const itemClass = isGrid ? "col form-check" : inline ? "form-check form-check-inline me-2" : "form-check";

    return (
        <div className="mb-2 col-12">
            <label className="form-label">{label}</label>

            {/* Lista de checkboxes (vertical u horizontal) */}
            <div className={listContainerClass}>
                {normalized.map((opt) => (
                    <div className={itemClass} key={opt.value}>
                        <input
                            className="form-check-input"
                            type="checkbox"
                            id={`${name}-${opt.value}`}
                            checked={selected.includes(opt.value)}
                            onChange={(e) => {
                                const checked = e.target.checked;
                                let next = selected;
                                if (checked && !selected.includes(opt.value)) {
                                    next = [...selected, opt.value];
                                } else if (!checked && selected.includes(opt.value)) {
                                    next = selected.filter((s) => s !== opt.value);
                                }
                                setSelected(next);
                                emit(next);
                            }}
                        />
                        <label className="form-check-label" htmlFor={`${name}-${opt.value}`}>{opt.label}</label>
                    </div>
                ))}
            </div>

            {/* Control para agregar 'Otro' */}
            {includeOtherChoice && (
                <div className="mt-2">
                    {!otherOpen ? (
                        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setOtherOpen(true)}>
                            Agregar otro…
                        </button>
                    ) : (
                        <div className="d-flex gap-2">
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Especificar otro"
                                value={otherValue}
                                onChange={(e) => setOtherValue(e.target.value)}
                            />
                            <button type="button" className="btn btn-secondary" onClick={addOther}>Agregar</button>
                            <button type="button" className="btn btn-outline-secondary" onClick={() => { setOtherOpen(false); setOtherValue(""); }}>Cancelar</button>
                        </div>
                    )}
                </div>
            )}

            {selected.length > 0 && (
                <div className="mt-2 d-flex flex-wrap gap-2">
                    {selected.map((val) => (
                        <span key={val} className="badge bg-secondary d-flex align-items-center gap-2">
                            {val}
                            <button
                                type="button"
                                className="btn btn-sm btn-light py-0 px-1"
                                onClick={() => removeItem(val)}
                                aria-label={`Quitar ${val}`}
                            >
                                ×
                            </button>
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
};

MultiSelectOrOther.propTypes = {
    label: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    value: PropTypes.string, // se almacena como string delimitado en el form
    options: PropTypes.arrayOf(
        PropTypes.oneOfType([
            PropTypes.string,
            PropTypes.shape({ value: PropTypes.string.isRequired, label: PropTypes.string.isRequired })
        ])
    ).isRequired,
    onChange: PropTypes.func.isRequired,
    includeOtherChoice: PropTypes.bool,
    delimiter: PropTypes.string,
    inline: PropTypes.bool,
    columns: PropTypes.number
};

export default MultiSelectOrOther;
