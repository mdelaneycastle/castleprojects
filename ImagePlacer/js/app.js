const App = {
    widthInput: null,
    categoryDisplay: null,
    exportBtn: null,
    resetBtn: null,
    backgroundInfo: null,
    currentImage: null,

    async init() {
        // Cache DOM elements
        this.widthInput = document.getElementById('artwork-width');
        this.categoryDisplay = document.getElementById('size-category').querySelector('span');
        this.exportBtn = document.getElementById('export-btn');
        this.resetBtn = document.getElementById('reset-btn');
        this.backgroundInfo = document.getElementById('background-info');

        // Initialize modules
        ArtworkRenderer.init('preview-canvas', 'placeholder-message');
        DragHandler.init('canvas-container', 'preview-canvas');
        ShadowController.init('rotation-wheel', 'wheel-indicator', 'rotation-degrees', 'shadow-opacity', 'shadow-distance');

        // Set up callbacks
        ImageUpload.init('upload-dropzone', 'artwork-input', 'artwork-thumb', this.onArtworkLoaded.bind(this));
        BackgroundManager.onBackgroundChange = this.onBackgroundChange.bind(this);
        ShadowController.onUpdate = this.onShadowUpdate.bind(this);
        DragHandler.onDrag = this.onDrag.bind(this);
        DragHandler.getArtworkBounds = () => ArtworkRenderer.getArtworkBounds();

        // Set up event listeners
        this.setupEventListeners();

        // Preload backgrounds
        await BackgroundManager.preloadBackgrounds();

        // Check for stored artwork
        this.checkStoredArtwork();
    },

    setupEventListeners() {
        // Width input
        this.widthInput.addEventListener('input', () => {
            this.onWidthChange();
        });

        // Export button
        this.exportBtn.addEventListener('click', () => {
            ExportManager.exportAsPNG();
        });

        // Reset button
        this.resetBtn.addEventListener('click', () => {
            this.onReset();
        });
    },

    onArtworkLoaded(image, metadata) {
        this.currentImage = image;
        this.updatePreview();
    },

    onWidthChange() {
        const width = parseFloat(this.widthInput.value);

        if (isNaN(width) || width <= 0) {
            this.categoryDisplay.textContent = '--';
            this.backgroundInfo.textContent = 'Enter artwork width';
            return;
        }

        // Get and display category
        const category = BackgroundManager.getSizeCategory(width);
        this.categoryDisplay.textContent = BackgroundManager.getCategoryLabel(category);

        // Switch background if needed
        BackgroundManager.setBackground(category);

        // Update artwork size
        this.updatePreview();
    },

    onBackgroundChange(category, image) {
        ArtworkRenderer.setBackground(category, image);
        this.backgroundInfo.textContent = `Background: ${BackgroundManager.getCategoryLabel(category)}`;
        this.updateUI();
    },

    onShadowUpdate() {
        ArtworkRenderer.render();
    },

    onDrag(x, y) {
        ArtworkRenderer.setPosition(x, y);
    },

    updatePreview() {
        const width = parseFloat(this.widthInput.value);

        if (this.currentImage && !isNaN(width) && width > 0) {
            ArtworkRenderer.setArtwork(this.currentImage, width);
        }

        this.updateUI();
    },

    updateUI() {
        // Enable/disable export button
        this.exportBtn.disabled = !ArtworkRenderer.isReady();
    },

    checkStoredArtwork() {
        const stored = ImageUpload.loadFromStorage();
        if (stored && stored.data) {
            ImageUpload.createImageFromBase64(stored.data).then((img) => {
                ImageUpload.showThumbnail(stored.data);
                this.onArtworkLoaded(img, stored.metadata);
            }).catch((err) => {
                console.warn('Could not restore stored artwork:', err);
                ImageUpload.clearStorage();
            });
        }
    },

    onReset() {
        // Clear image upload
        ImageUpload.clearStorage();
        ImageUpload.clearThumbnail();
        document.getElementById('artwork-input').value = '';

        // Clear width input
        this.widthInput.value = '';
        this.categoryDisplay.textContent = '--';

        // Reset shadow
        ShadowController.reset();

        // Reset renderer
        ArtworkRenderer.reset();

        // Reset state
        this.currentImage = null;
        this.backgroundInfo.textContent = 'No background loaded';

        // Update UI
        this.updateUI();
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => App.init());
