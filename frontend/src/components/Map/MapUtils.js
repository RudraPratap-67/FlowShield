export function generateGridOverlayURL(width, height, colorizerFn) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    const imgData = ctx.createImageData(width, height);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const [r, g, b, a] = colorizerFn(x, y);
            const idx = (y * width + x) * 4;
            imgData.data[idx] = r;
            imgData.data[idx + 1] = g;
            imgData.data[idx + 2] = b;
            imgData.data[idx + 3] = a;
        }
    }
    ctx.putImageData(imgData, 0, 0);
    return canvas.toDataURL();
}

export function generateVectorOverlayURL(width, height, frame, arrowColor) {
    const canvas = document.createElement("canvas");
    const scale = 20;
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext("2d");

    ctx.strokeStyle = arrowColor;
    ctx.lineWidth = 1.5;
    ctx.fillStyle = arrowColor;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const vx = frame.flow.vx[y][x];
            const vy = frame.flow.vy[y][x];
            const mag = Math.sqrt(vx * vx + vy * vy);

            if (mag > 0.005) {
                const cx = (x + 0.5) * scale;
                const cy = (y + 0.5) * scale;

                let normMag = Math.min(mag * 200, scale / 2.5);
                if (normMag < 3) normMag = 3;

                const angle = Math.atan2(vy, vx);

                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate(angle);

                ctx.beginPath();
                ctx.moveTo(-normMag, 0);
                ctx.lineTo(normMag, 0);
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(normMag, 0);
                ctx.lineTo(normMag - 4, -3);
                ctx.lineTo(normMag - 4, 3);
                ctx.fill();

                ctx.restore();
            }
        }
    }
    return canvas.toDataURL();
}
