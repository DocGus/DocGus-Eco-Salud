import React, { useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const SnapshotViewer = () => {
    const [showModal, setShowModal] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    // Espera recibir snapshotUrl y fileId por state
    const { snapshotUrl, fileId } = location.state || {};

    if (!snapshotUrl) {
        return (
            <div className="container py-4">
                <h2>No se encontró el snapshot</h2>
                <button className="btn btn-secondary" onClick={() => navigate(-1)}>
                    Volver
                </button>
            </div>
        );
    }


    // Mostrar modal grande al hacer clic
    const [zoom, setZoom] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [dragging, setDragging] = useState(false);
    const [spacePressed, setSpacePressed] = useState(false);
    const lastPos = useRef({ x: 0, y: 0 });
    const containerRef = useRef(null);

    // Limitar el offset para no perder la imagen
    const limitOffset = (offset, zoom, imgWidth, imgHeight, containerWidth, containerHeight) => {
        if (zoom <= 1) return { x: 0, y: 0 };
        const maxX = Math.max(0, ((imgWidth * zoom) - containerWidth) / 2);
        const maxY = Math.max(0, ((imgHeight * zoom) - containerHeight) / 2);
        return {
            x: Math.max(-maxX, Math.min(maxX, offset.x)),
            y: Math.max(-maxY, Math.min(maxY, offset.y)),
        };
    };

    const handleImgClick = () => {
        setShowModal(true);
        setZoom(1);
        setOffset({ x: 0, y: 0 });
    };
    const handleCloseModal = (e) => {
        // Solo cerrar si el click es en el fondo, no en la imagen ni controles
        if (e.target === e.currentTarget) setShowModal(false);
    };
    // Permitir zoom con scroll del mouse
    const handleWheel = (e) => {
        e.preventDefault();
        setZoom((prev) => {
            let next = prev + (e.deltaY < 0 ? 0.1 : -0.1);
            if (next < 1) next = 1;
            if (next > 4) next = 4;
            if (next === 1) setOffset({ x: 0, y: 0 });
            return Math.round(next * 100) / 100;
        });
    };
    // Pan (arrastrar imagen con mouse o barra espaciadora)
    const handleMouseDown = (e) => {
        if (zoom === 1) return;
        if (e.button !== 0) return; // solo click izquierdo
        if (!spacePressed && e.target.tagName !== 'IMG') return;
        setDragging(true);
        lastPos.current = { x: e.clientX, y: e.clientY };
    };
    const handleMouseUp = () => setDragging(false);
    const handleMouseLeave = () => setDragging(false);
    const handleMouseMove = (e) => {
        if (!dragging) return;
        const dx = e.clientX - lastPos.current.x;
        const dy = e.clientY - lastPos.current.y;
        setOffset((prev) => {
            // Limitar el offset según el tamaño de la imagen y el contenedor
            const img = containerRef.current?.querySelector('img');
            const cont = containerRef.current;
            if (img && cont) {
                const imgWidth = img.naturalWidth;
                const imgHeight = img.naturalHeight;
                const cWidth = cont.offsetWidth;
                const cHeight = cont.offsetHeight;
                const newOffset = { x: prev.x + dx, y: prev.y + dy };
                return limitOffset(newOffset, zoom, imgWidth, imgHeight, cWidth, cHeight);
            }
            return { x: prev.x + dx, y: prev.y + dy };
        });
        lastPos.current = { x: e.clientX, y: e.clientY };
    };
    // Tecla espacio para pan
    React.useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.code === 'Space') setSpacePressed(true);
        };
        const handleKeyUp = (e) => {
            if (e.code === 'Space') setSpacePressed(false);
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);
    // Reset zoom y offset
    const handleReset = () => {
        setZoom(1);
        setOffset({ x: 0, y: 0 });
    };
    // Botones de zoom
    const handleZoomIn = () => setZoom((z) => Math.min(4, Math.round((z + 0.2) * 100) / 100));
    const handleZoomOut = () => setZoom((z) => {
        const next = Math.max(1, Math.round((z - 0.2) * 100) / 100);
        if (next === 1) setOffset({ x: 0, y: 0 });
        return next;
    });

    return (
        <div className="container py-4">
            <h2>Vista de Snapshot</h2>
            <div className="mb-3 text-center">
                <img
                    src={snapshotUrl}
                    alt="snapshot"
                    style={{ maxWidth: "100%", maxHeight: 600, border: "1px solid #ccc", borderRadius: 8, cursor: 'zoom-in' }}
                    title="Haz clic para ampliar"
                    onClick={handleImgClick}
                />
                <div className="small text-muted mt-2">Haz clic en la imagen para verla en grande</div>
            </div>
            <button className="btn btn-secondary" onClick={() => navigate(-1)}>
                Volver
            </button>

            {/* Modal grande para la imagen */}
            {showModal && (
                <div
                    ref={containerRef}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100vw',
                        height: '100vh',
                        background: 'rgba(0,0,0,0.85)',
                        zIndex: 9999,
                        overflow: 'auto',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: zoom > 1 ? (dragging ? 'grabbing' : (spacePressed ? 'grab' : 'zoom-in')) : 'zoom-in',
                        userSelect: dragging ? 'none' : 'auto',
                    }}
                    onClick={handleCloseModal}
                    onMouseUp={handleMouseUp}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                >
                    <div style={{ position: 'relative' }}>
                        <img
                            src={snapshotUrl}
                            alt="snapshot-modal"
                            style={{
                                border: '4px solid #fff',
                                borderRadius: 12,
                                boxShadow: '0 0 32px #000',
                                background: '#fff',
                                maxWidth: 'none',
                                maxHeight: 'none',
                                width: 'auto',
                                height: 'auto',
                                display: 'block',
                                transform: `scale(${zoom}) translate(${offset.x / zoom}px, ${offset.y / zoom}px)`,
                                transition: dragging ? 'none' : 'transform 0.2s',
                                cursor: zoom > 1 ? (dragging ? 'grabbing' : (spacePressed ? 'grab' : 'zoom-in')) : 'zoom-in',
                            }}
                            onWheel={handleWheel}
                            onMouseDown={handleMouseDown}
                            draggable={false}
                            title="Zoom: rueda del mouse, Pan: arrastra con mouse o barra espaciadora + arrastre, Doble clic para reset"
                            onDoubleClick={handleReset}
                        />
                        {/* Controles de zoom y reset */}
                        <div style={{
                            position: 'absolute',
                            top: 12,
                            right: 12,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8,
                            zIndex: 10000,
                        }}>
                            <button onClick={handleZoomIn} style={{ fontSize: 22, padding: 4, borderRadius: 6, border: 'none', background: '#fff', cursor: 'pointer' }}>+</button>
                            <button onClick={handleZoomOut} style={{ fontSize: 22, padding: 4, borderRadius: 6, border: 'none', background: '#fff', cursor: 'pointer' }}>-</button>
                            <button onClick={handleReset} style={{ fontSize: 16, padding: 4, borderRadius: 6, border: 'none', background: '#fff', cursor: 'pointer' }}>Reset</button>
                        </div>
                        <div style={{
                            position: 'absolute',
                            bottom: 24,
                            left: 0,
                            width: '100%',
                            textAlign: 'center',
                            color: '#fff',
                            fontSize: 16,
                            textShadow: '0 0 8px #000',
                        }}>
                            Zoom: {Math.round(zoom * 100)}%
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SnapshotViewer;
