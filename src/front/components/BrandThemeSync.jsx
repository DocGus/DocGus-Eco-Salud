import React, { useEffect } from "react";
import logo from "../assets/img/sansanarte.png";

// Extrae un color dominante del logo y actualiza --brand-bg para emparejar el guinda
const BrandThemeSync = () => {
    useEffect(() => {
        try {
            const img = new Image();
            img.crossOrigin = "anonymous"; // por si acaso
            img.src = logo;
            img.onload = () => {
                // Si existe un override fijo en CSS, respetarlo y no recalcular
                const root = document.documentElement;
                const override = getComputedStyle(root).getPropertyValue("--brand-bg-override").trim();
                if (override) {
                    root.style.setProperty("--brand-bg", override);
                    return;
                }
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d", { willReadFrequently: true });
                const target = 96; // escalar para acelerar
                const scale = Math.max(img.width, img.height) > target ? target / Math.max(img.width, img.height) : 1;
                canvas.width = Math.max(1, Math.floor(img.width * scale));
                canvas.height = Math.max(1, Math.floor(img.height * scale));
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);

                // Histograma cuantizado 4 bits por canal (4096 bins)
                const bins = new Map();
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
                    if (a < 16) continue; // ignorar casi transparente
                    const sum = r + g + b;
                    if (sum > 740) continue; // ignorar casi blanco
                    if (sum < 24) continue; // ignorar casi negro
                    const r4 = r >> 4, g4 = g >> 4, b4 = b >> 4;
                    const key = (r4 << 8) | (g4 << 4) | b4;
                    bins.set(key, (bins.get(key) || 0) + 1);
                }

                if (bins.size === 0) return; // no cambiar si no hay datos válidos
                // Tomar el bin más frecuente como dominante
                let bestKey = null, bestCount = -1;
                bins.forEach((count, key) => {
                    if (count > bestCount) { bestCount = count; bestKey = key; }
                });
                const r4 = (bestKey >> 8) & 0xF;
                const g4 = (bestKey >> 4) & 0xF;
                const b4 = bestKey & 0xF;
                // Convertir al centro del bin (aprox)
                const qTo8 = (q) => Math.min(255, q * 16 + 8);
                const R = qTo8(r4), G = qTo8(g4), B = qTo8(b4);

                // Suavizar hacia guinda (sesgo a tonos rojos IPN) y oscurecer ligeramente
                const mix = (a, b, t) => Math.round(a * (1 - t) + b * t);
                const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
                const targetGuinda = { r: 106, g: 0, b: 50 }; // #6a0032
                // Aumentamos la mezcla hacia el guinda objetivo para acercar el matiz y profundidad
                const Rm = mix(R, targetGuinda.r, 0.4);
                const Gm = mix(G, targetGuinda.g, 0.4);
                const Bm = mix(B, targetGuinda.b, 0.4);

                // Convertir a HSL para ajustar luminosidad y saturación suavemente
                const rgbToHsl = (r, g, b) => {
                    r /= 255; g /= 255; b /= 255;
                    const max = Math.max(r, g, b), min = Math.min(r, g, b);
                    let h, s, l = (max + min) / 2;
                    if (max === min) { h = s = 0; }
                    else {
                        const d = max - min;
                        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                        switch (max) {
                            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                            case g: h = (b - r) / d + 2; break;
                            default: h = (r - g) / d + 4; break;
                        }
                        h /= 6;
                    }
                    return [h, s, l];
                };
                const hslToRgb = (h, s, l) => {
                    let r, g, b;
                    if (s === 0) { r = g = b = l; }
                    else {
                        const hue2rgb = (p, q, t) => {
                            if (t < 0) t += 1; if (t > 1) t -= 1;
                            if (t < 1 / 6) return p + (q - p) * 6 * t;
                            if (t < 1 / 2) return q;
                            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                            return p;
                        };
                        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                        const p = 2 * l - q;
                        r = hue2rgb(p, q, h + 1 / 3);
                        g = hue2rgb(p, q, h);
                        b = hue2rgb(p, q, h - 1 / 3);
                    }
                    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
                };

                let [h, s, l] = rgbToHsl(Rm, Gm, Bm);
                // Mover ligeramente el matiz hacia rojo (cercano a 1.0 / 0.0) para un toque "rojo-sangre"
                const hueTowards = (h, target, t) => {
                    // maneja wrap-around del círculo de color
                    let dh = target - h;
                    if (dh > 0.5) dh -= 1; else if (dh < -0.5) dh += 1;
                    let out = h + dh * t;
                    if (out < 0) out += 1; else if (out > 1) out -= 1;
                    return out;
                };
                const targetHue = rgbToHsl(targetGuinda.r, targetGuinda.g, targetGuinda.b)[0] || 0.0;
                h = hueTowards(h, targetHue > 0.9 ? 1.0 : targetHue, 0.08); // 8% hacia el rojo objetivo
                // Oscurecer un poco más el fondo para acercarlo al logo (reduce luminosidad)
                l = clamp(l * 0.82, 0, 1); // 18% más oscuro
                // Sutil extra de saturación para un matiz más vivo
                s = clamp(s * 1.08, 0, 1);
                const [Rd, Gd, Bd] = hslToRgb(h, s, l);

                const css = `rgb(${Rd}, ${Gd}, ${Bd})`;
                document.documentElement.style.setProperty("--brand-bg", css);
            };
        } catch (e) {
            // Silencioso: si falla, mantenemos el color por defecto
        }
    }, []);

    return null;
};

export default BrandThemeSync;
