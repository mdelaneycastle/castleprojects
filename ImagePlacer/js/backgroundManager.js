const BackgroundManager = {
    currentCategory: null,
    backgroundImages: {},
    onBackgroundChange: null,

    async preloadBackgrounds() {
        const categories = ['small', 'medium', 'large'];
        const loadPromises = categories.map((category) => {
            return new Promise((resolve) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => {
                    this.backgroundImages[category] = img;
                    resolve();
                };
                img.onerror = () => {
                    // Retry without crossOrigin for file:// protocol
                    const img2 = new Image();
                    img2.onload = () => {
                        this.backgroundImages[category] = img2;
                        resolve();
                    };
                    img2.onerror = () => {
                        console.warn(`Failed to load background: ${category}`);
                        resolve();
                    };
                    img2.src = CONFIG.backgrounds[category].path;
                };
                img.src = CONFIG.backgrounds[category].path;
            });
        });

        await Promise.all(loadPromises);
    },

    getSizeCategory(widthInches) {
        if (widthInches < CONFIG.sizeThresholds.small.max) {
            return 'small';
        } else if (widthInches <= CONFIG.sizeThresholds.medium.max) {
            return 'medium';
        } else {
            return 'large';
        }
    },

    getCategoryLabel(category) {
        const labels = {
            small: 'Small (< 50cm)',
            medium: 'Medium (50 - 90cm)',
            large: 'Large (> 90cm)'
        };
        return labels[category] || category;
    },

    setBackground(category) {
        if (category === this.currentCategory) {
            return false; // No change
        }

        if (!this.backgroundImages[category]) {
            console.warn(`Background not loaded for category: ${category}`);
            return false;
        }

        this.currentCategory = category;

        if (this.onBackgroundChange) {
            this.onBackgroundChange(category, this.backgroundImages[category]);
        }

        return true;
    },

    getBackgroundForSize(widthInches) {
        const category = this.getSizeCategory(widthInches);
        return {
            category: category,
            config: CONFIG.backgrounds[category],
            image: this.backgroundImages[category]
        };
    },

    getPixelsPerCm() {
        if (!this.currentCategory) return 1;

        const bg = this.backgroundImages[this.currentCategory];
        const config = CONFIG.backgrounds[this.currentCategory];

        if (!bg || !config) return 1;

        return bg.naturalWidth / config.wallWidthCm;
    },

    getCurrentImage() {
        return this.backgroundImages[this.currentCategory] || null;
    },

    getCurrentConfig() {
        return CONFIG.backgrounds[this.currentCategory] || null;
    }
};
