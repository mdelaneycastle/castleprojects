const ArtworkRenderer = {
    canvas: null,
    ctx: null,
    placeholder: null,
    artwork: {
        image: null,
        widthCm: 0,
        x: 0,
        y: 0,
        displayWidth: 0,
        displayHeight: 0
    },
    background: {
        image: null,
        category: null
    },

    init(canvasId, placeholderId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.placeholder = document.getElementById(placeholderId);
    },

    setBackground(category, image) {
        this.background.category = category;
        this.background.image = image;

        // Set canvas dimensions to match background
        this.canvas.width = image.naturalWidth;
        this.canvas.height = image.naturalHeight;

        // Recalculate artwork size if we have one
        if (this.artwork.image && this.artwork.widthInches > 0) {
            this.calculateArtworkDisplaySize();
            this.centerArtwork();
        }

        this.render();
    },

    setArtwork(image, widthCm) {
        this.artwork.image = image;
        this.artwork.widthCm = widthCm;

        if (this.background.image) {
            this.calculateArtworkDisplaySize();
            this.centerArtwork();
            this.render();
        }
    },

    calculateArtworkDisplaySize() {
        if (!this.artwork.image || !this.background.image) return;

        const pixelsPerCm = BackgroundManager.getPixelsPerCm();
        const displayWidth = this.artwork.widthCm * pixelsPerCm;
        const aspectRatio = this.artwork.image.naturalHeight / this.artwork.image.naturalWidth;
        const displayHeight = displayWidth * aspectRatio;

        this.artwork.displayWidth = displayWidth;
        this.artwork.displayHeight = displayHeight;
    },

    centerArtwork() {
        if (!this.canvas || !this.artwork.displayWidth) return;

        this.artwork.x = (this.canvas.width - this.artwork.displayWidth) / 2;
        this.artwork.y = (this.canvas.height - this.artwork.displayHeight) / 2;
    },

    setPosition(x, y) {
        // Constrain to canvas bounds with some margin
        const margin = 50;
        const minX = -this.artwork.displayWidth + margin;
        const maxX = this.canvas.width - margin;
        const minY = -this.artwork.displayHeight + margin;
        const maxY = this.canvas.height - margin;

        this.artwork.x = Math.max(minX, Math.min(maxX, x));
        this.artwork.y = Math.max(minY, Math.min(maxY, y));

        this.render();
    },

    getArtworkBounds() {
        return {
            x: this.artwork.x,
            y: this.artwork.y,
            width: this.artwork.displayWidth,
            height: this.artwork.displayHeight
        };
    },

    render() {
        if (!this.background.image) {
            this.showPlaceholder();
            return;
        }

        this.hidePlaceholder();
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Layer 1: Background
        this.drawBackground();

        // Only draw artwork layers if we have an artwork
        if (this.artwork.image && this.artwork.displayWidth > 0) {
            // Draw artwork with drop shadow
            this.drawArtwork();
        }
    },

    drawBackground() {
        this.ctx.drawImage(
            this.background.image,
            0, 0,
            this.canvas.width, this.canvas.height
        );
    },

    drawArtwork() {
        this.ctx.save();

        // Apply drop shadow
        ShadowController.applyShadow(this.ctx);

        // Draw artwork
        this.ctx.drawImage(
            this.artwork.image,
            this.artwork.x,
            this.artwork.y,
            this.artwork.displayWidth,
            this.artwork.displayHeight
        );

        this.ctx.restore();
    },

    showPlaceholder() {
        this.canvas.classList.remove('visible');
        this.placeholder.classList.remove('hidden');
    },

    hidePlaceholder() {
        this.canvas.classList.add('visible');
        this.placeholder.classList.add('hidden');
    },

    hasArtwork() {
        return this.artwork.image !== null && this.artwork.widthCm > 0;
    },

    hasBackground() {
        return this.background.image !== null;
    },

    isReady() {
        return this.hasArtwork() && this.hasBackground();
    },

    reset() {
        this.artwork = {
            image: null,
            widthCm: 0,
            x: 0,
            y: 0,
            displayWidth: 0,
            displayHeight: 0
        };
        this.background = {
            image: null,
            category: null
        };

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.showPlaceholder();
    }
};
