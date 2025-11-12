import React, { useState } from "react";
import PropTypes from "prop-types";

/**
 * SelectOrOther
 * Componente para seleccionar una opción predefinida o escribir "Otro".
 * Props:
 *  - label: Etiqueta del campo
 *  - name: Nombre del campo (propiedad en el form)
 *  - value: Valor actual
 *  - options: Array<string> de opciones predefinidas
 *  - onChange: (name, value) => void
 *  - otherPlaceholder?: Placeholder para el campo "Otro"
 */
const normalizeOptions = (opts) =>
    (opts || []).map((opt) =>
        typeof opt === "string"
            ? { value: opt, label: opt }
            : { value: opt.value, label: opt.label }
    );

const SelectOrOther = ({ label, name, value, options, onChange, otherPlaceholder = "Especificar otro", includeOtherChoice = true, invalid = false }) => {
    const normalized = normalizeOptions(options);
    const values = normalized.map((o) => o.value);
    const isOther = value && !values.includes(value);
    const [mode, setMode] = useState(isOther ? "other" : "select");
    const [otherValue, setOtherValue] = useState(isOther ? value : "");

    const handleSelectChange = (e) => {
        const v = e.target.value;
        if (v === "__other__") {
            setMode("other");
            // Limpiar valor hasta que escriba algo
            onChange(name, "");
        } else {
            setMode("select");
            setOtherValue("");
            onChange(name, v);
        }
    };

    const handleOtherChange = (e) => {
        const v = e.target.value;
        setOtherValue(v);
        onChange(name, v);
    };

    return (
        <div className="mb-2 col-6">
            <label className="form-label">{label}</label>
            {mode === "select" && (
                <select className={`form-select ${invalid ? 'is-invalid' : ''}`} value={value || ""} onChange={handleSelectChange} name={name}>
                    <option value="">Seleccionar...</option>
                    {normalized.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                    {includeOtherChoice && <option value="__other__">Otro...</option>}
                </select>
            )}
            {includeOtherChoice && mode === "other" && (
                <div className="d-flex gap-2">
                    <input
                        type="text"
                        className="form-control"
                        placeholder={otherPlaceholder}
                        value={otherValue}
                        onChange={handleOtherChange}
                        name={name}
                    />
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => {
                            setMode("select");
                            setOtherValue("");
                            onChange(name, "");
                        }}
                    >
                        Volver
                    </button>
                </div>
            )}
        </div>
    );
};

SelectOrOther.propTypes = {
    label: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    value: PropTypes.string,
    options: PropTypes.arrayOf(
        PropTypes.oneOfType([
            PropTypes.string,
            PropTypes.shape({ value: PropTypes.string.isRequired, label: PropTypes.string.isRequired })
        ])
    ).isRequired,
    onChange: PropTypes.func.isRequired,
    otherPlaceholder: PropTypes.string,
    includeOtherChoice: PropTypes.bool,
    invalid: PropTypes.bool
};

export default SelectOrOther;
