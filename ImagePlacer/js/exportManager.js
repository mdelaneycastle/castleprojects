const ExportManager = {
    exportAsPNG(filename = null) {
        if (!ArtworkRenderer.isReady()) {
            alert('Please upload an artwork and enter its width before exporting.');
            return;
        }

        const bg = BackgroundManager.getCurrentImage();
        if (!bg) {
            alert('No background loaded.');
            return;
        }

        // Create export canvas at full resolution
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = bg.naturalWidth;
        exportCanvas.height = bg.naturalHeight;

        const ctx = exportCanvas.getContext('2d');

        // Calculate scale from display to export
        const displayCanvas = ArtworkRenderer.canvas;
        const scale = bg.naturalWidth / displayCanvas.width;

        // Draw background at full resolution
        ctx.drawImage(bg, 0, 0, exportCanvas.width, exportCanvas.height);

        // Get artwork bounds and scale them
        const bounds = ArtworkRenderer.getArtworkBounds();
        const scaledBounds = {
            x: bounds.x * scale,
            y: bounds.y * scale,
            width: bounds.width * scale,
            height: bounds.height * scale
        };

        // Draw artwork with drop shadow (scaled)
        ctx.save();
        ShadowController.applyShadow(ctx, scale);
        ctx.drawImage(
            ArtworkRenderer.artwork.image,
            scaledBounds.x,
            scaledBounds.y,
            scaledBounds.width,
            scaledBounds.height
        );
        ctx.restore();

        // Export
        try {
            const dataUrl = exportCanvas.toDataURL('image/png');
            this.downloadImage(dataUrl, filename || this.generateFilename());
        } catch (e) {
            if (e.name === 'SecurityError') {
                alert('Export requires running from a local server.\n\nRun this command in the project folder:\npython3 -m http.server 8000\n\nThen open http://localhost:8000');
            } else {
                throw e;
            }
        }
    },

    downloadImage(dataUrl, filename) {
        const link = document.createElement('a');
        link.download = filename;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },

    generateFilename() {
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
        const category = BackgroundManager.currentCategory || 'artwork';
        return `artwork-preview-${category}-${timestamp}.png`;
    }
};
