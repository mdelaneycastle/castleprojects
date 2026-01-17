const ImageUpload = {
    dropzone: null,
    input: null,
    thumbContainer: null,
    onImageLoaded: null,

    init(dropzoneId, inputId, thumbId, callback) {
        this.dropzone = document.getElementById(dropzoneId);
        this.input = document.getElementById(inputId);
        this.thumbContainer = document.getElementById(thumbId);
        this.onImageLoaded = callback;

        this.setupEventListeners();
    },

    setupEventListeners() {
        // File input change
        this.input.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                this.handleFileSelect(e.target.files[0]);
            }
        });

        // Drag and drop
        this.dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.dropzone.classList.add('dragover');
        });

        this.dropzone.addEventListener('dragleave', () => {
            this.dropzone.classList.remove('dragover');
        });

        this.dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            this.dropzone.classList.remove('dragover');
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                this.handleFileSelect(e.dataTransfer.files[0]);
            }
        });
    },

    handleFileSelect(file) {
        const validation = this.validateImage(file);
        if (!validation.valid) {
            alert(validation.error);
            return;
        }

        this.fileToBase64(file).then((base64) => {
            const metadata = {
                name: file.name,
                type: file.type,
                size: file.size,
                timestamp: Date.now()
            };

            this.saveToStorage(base64, metadata);
            this.showThumbnail(base64);
            this.createImageFromBase64(base64).then((img) => {
                if (this.onImageLoaded) {
                    this.onImageLoaded(img, metadata);
                }
            });
        });
    },

    validateImage(file) {
        if (!file.type.startsWith('image/')) {
            return { valid: false, error: 'Please select an image file.' };
        }

        // Check file size (max 10MB before compression)
        if (file.size > 10 * 1024 * 1024) {
            return { valid: false, error: 'Image is too large. Maximum size is 10MB.' };
        }

        return { valid: true };
    },

    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                // Compress if needed
                this.compressImage(reader.result).then(resolve).catch(reject);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    },

    compressImage(dataUrl, maxWidth = 2500, quality = 0.85) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                let { width, height } = img;

                // Only compress if larger than maxWidth
                if (width <= maxWidth) {
                    resolve(dataUrl);
                    return;
                }

                const canvas = document.createElement('canvas');
                height = (height * maxWidth) / width;
                width = maxWidth;

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.src = dataUrl;
        });
    },

    saveToStorage(base64Data, metadata) {
        try {
            localStorage.setItem(CONFIG.storage.artworkKey, JSON.stringify({
                data: base64Data,
                metadata: metadata
            }));
        } catch (e) {
            console.warn('Could not save to localStorage:', e);
            // Continue without storage - image is already in memory
        }
    },

    loadFromStorage() {
        try {
            const stored = localStorage.getItem(CONFIG.storage.artworkKey);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.warn('Could not load from localStorage:', e);
        }
        return null;
    },

    clearStorage() {
        try {
            localStorage.removeItem(CONFIG.storage.artworkKey);
            localStorage.removeItem(CONFIG.storage.settingsKey);
        } catch (e) {
            console.warn('Could not clear localStorage:', e);
        }
    },

    createImageFromBase64(base64) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = base64;
        });
    },

    showThumbnail(base64) {
        this.thumbContainer.innerHTML = `<img src="${base64}" alt="Uploaded artwork">`;
        this.thumbContainer.classList.add('has-image');
    },

    clearThumbnail() {
        this.thumbContainer.innerHTML = '';
        this.thumbContainer.classList.remove('has-image');
    }
};
