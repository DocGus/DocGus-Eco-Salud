import React from "react";
import PropTypes from "prop-types";

/**
 * RoleInfoCard
 * Card informativa reutilizable para páginas de rol (Paciente/Estudiante/Profesional).
 * Props:
 * - title: string (título dentro de la card)
 * - paragraphs: string[] (lista de párrafos)
 * - ctaHref?: string (url del botón)
 * - ctaLabel?: string (texto del botón)
 * - ctaVariant?: 'light' | 'primary' (estilo del botón)
 */
const RoleInfoCard = ({ title, paragraphs = [], ctaHref, ctaLabel, ctaVariant = 'light' }) => {
    const btnClass = ctaVariant === 'primary' ? 'btn btn-primary' : 'btn btn-light text-dark fw-semibold';

    return (
        <div className="card brand-form-card" style={{ borderRadius: "10px" }}>
            <div className="card-body">
                {title && <h5 className="card-title mb-2">{title}</h5>}
                {paragraphs.map((p, idx) => (
                    <p key={idx} className="card-text text-muted-light mb-2">
                        {p}
                    </p>
                ))}
                {ctaHref && ctaLabel && (
                    <div className="d-flex justify-content-center mt-3">
                        <a href={ctaHref} className={btnClass}>
                            {ctaLabel}
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RoleInfoCard;

RoleInfoCard.propTypes = {
    title: PropTypes.string,
    paragraphs: PropTypes.arrayOf(PropTypes.string),
    ctaHref: PropTypes.string,
    ctaLabel: PropTypes.string,
    ctaVariant: PropTypes.oneOf(['light', 'primary'])
};

