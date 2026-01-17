const DragHandler = {
    container: null,
    canvas: null,
    isDragging: false,
    startX: 0,
    startY: 0,
    artworkStartX: 0,
    artworkStartY: 0,
    onDrag: null,
    onDragEnd: null,
    getArtworkBounds: null,

    init(containerId, canvasId) {
        this.container = document.getElementById(containerId);
        this.canvas = document.getElementById(canvasId);

        this.setupEventListeners();
    },

    setupEventListeners() {
        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => this.handleStart(e));
        document.addEventListener('mousemove', (e) => this.handleMove(e));
        document.addEventListener('mouseup', (e) => this.handleEnd(e));

        // Touch events
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.handleStart(e.touches[0]);
        });
        document.addEventListener('touchmove', (e) => {
            if (this.isDragging) {
                e.preventDefault();
                this.handleMove(e.touches[0]);
            }
        }, { passive: false });
        document.addEventListener('touchend', (e) => this.handleEnd(e));

        // Cursor updates
        this.canvas.addEventListener('mousemove', (e) => {
            if (!this.isDragging) {
                this.updateCursor(e);
            }
        });
    },

    handleStart(e) {
        const coords = this.getCanvasCoordinates(e);
        const bounds = this.getArtworkBounds ? this.getArtworkBounds() : null;

        if (bounds && this.isPointInBounds(coords.x, coords.y, bounds)) {
            this.isDragging = true;
            this.startX = coords.x;
            this.startY = coords.y;
            this.artworkStartX = bounds.x;
            this.artworkStartY = bounds.y;
            this.container.classList.add('dragging');
        }
    },

    handleMove(e) {
        if (!this.isDragging) return;

        const coords = this.getCanvasCoordinates(e);
        const deltaX = coords.x - this.startX;
        const deltaY = coords.y - this.startY;

        const newX = this.artworkStartX + deltaX;
        const newY = this.artworkStartY + deltaY;

        if (this.onDrag) {
            this.onDrag(newX, newY);
        }
    },

    handleEnd(e) {
        if (this.isDragging) {
            this.isDragging = false;
            this.container.classList.remove('dragging');

            if (this.onDragEnd) {
                this.onDragEnd();
            }
        }
    },

    updateCursor(e) {
        const coords = this.getCanvasCoordinates(e);
        const bounds = this.getArtworkBounds ? this.getArtworkBounds() : null;

        if (bounds && this.isPointInBounds(coords.x, coords.y, bounds)) {
            this.container.classList.add('can-drag');
        } else {
            this.container.classList.remove('can-drag');
        }
    },

    getCanvasCoordinates(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    },

    isPointInBounds(x, y, bounds) {
        return (
            x >= bounds.x &&
            x <= bounds.x + bounds.width &&
            y >= bounds.y &&
            y <= bounds.y + bounds.height
        );
    }
};
