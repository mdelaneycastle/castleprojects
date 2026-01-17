const ShadowController = {
    angle: CONFIG.shadow.defaultAngle,
    opacity: CONFIG.shadow.defaultOpacity,
    distance: 0.4, // 0-1 range, default 40%
    maxDistance: 50, // max pixels at base scale
    wheel: null,
    indicator: null,
    degreesDisplay: null,
    opacitySlider: null,
    distanceSlider: null,
    isDragging: false,
    onUpdate: null,

    init(wheelId, indicatorId, degreesDisplayId, opacitySliderId, distanceSliderId) {
        this.wheel = document.getElementById(wheelId);
        this.indicator = document.getElementById(indicatorId);
        this.degreesDisplay = document.getElementById(degreesDisplayId);
        this.opacitySlider = document.getElementById(opacitySliderId);
        this.distanceSlider = document.getElementById(distanceSliderId);

        this.setupEventListeners();
        this.updateWheelIndicator();
    },

    setupEventListeners() {
        // Rotation wheel events
        this.wheel.addEventListener('mousedown', (e) => this.handleWheelStart(e));
        document.addEventListener('mousemove', (e) => this.handleWheelMove(e));
        document.addEventListener('mouseup', () => this.handleWheelEnd());

        // Touch support
        this.wheel.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.handleWheelStart(e.touches[0]);
        });
        document.addEventListener('touchmove', (e) => {
            if (this.isDragging) {
                e.preventDefault();
                this.handleWheelMove(e.touches[0]);
            }
        }, { passive: false });
        document.addEventListener('touchend', () => this.handleWheelEnd());

        // Opacity slider
        this.opacitySlider.addEventListener('input', (e) => {
            this.setOpacity(e.target.value / 100);
        });

        // Distance slider
        this.distanceSlider.addEventListener('input', (e) => {
            this.setDistance(e.target.value / 100);
        });
    },

    handleWheelStart(e) {
        this.isDragging = true;
        this.handleWheelInteraction(e);
    },

    handleWheelMove(e) {
        if (!this.isDragging) return;
        this.handleWheelInteraction(e);
    },

    handleWheelEnd() {
        this.isDragging = false;
    },

    handleWheelInteraction(e) {
        const rect = this.wheel.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const deltaX = e.clientX - centerX;
        const deltaY = e.clientY - centerY;

        // Calculate angle from center to mouse position
        let angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

        // Normalize to 0-360
        angle = (angle + 360) % 360;

        this.setAngle(angle);
    },

    setAngle(degrees) {
        this.angle = Math.round(degrees);
        this.updateWheelIndicator();

        if (this.onUpdate) {
            this.onUpdate();
        }
    },

    setOpacity(value) {
        this.opacity = Math.max(0, Math.min(1, value));

        if (this.onUpdate) {
            this.onUpdate();
        }
    },

    setDistance(value) {
        this.distance = Math.max(0, Math.min(1, value));

        if (this.onUpdate) {
            this.onUpdate();
        }
    },

    updateWheelIndicator() {
        this.indicator.style.transform = `translateY(-50%) rotate(${this.angle}deg)`;
        this.degreesDisplay.textContent = this.angle;
    },

    calculateDropShadowOffset(scale = 1) {
        const radians = this.angle * (Math.PI / 180);
        const distance = this.distance * this.maxDistance * scale;

        return {
            x: Math.cos(radians) * distance,
            y: Math.sin(radians) * distance
        };
    },

    applyShadow(ctx, scale = 1) {
        const offset = this.calculateDropShadowOffset(scale);

        ctx.shadowColor = `rgba(0, 0, 0, ${this.opacity})`;
        ctx.shadowBlur = CONFIG.shadow.dropShadowBlur * scale;
        ctx.shadowOffsetX = offset.x;
        ctx.shadowOffsetY = offset.y;
    },

    clearShadow(ctx) {
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
    },

    drawFloatingShadow(ctx, bounds, scale = 1) {
        ctx.save();

        const shadowWidth = bounds.width * 0.85;
        const shadowHeight = Math.max(bounds.height * 0.08, 10 * scale);
        const shadowX = bounds.x + (bounds.width - shadowWidth) / 2;
        const shadowY = bounds.y + bounds.height + (CONFIG.shadow.floatShadowOffsetY * scale);

        // Create gradient for soft edges
        const gradient = ctx.createRadialGradient(
            shadowX + shadowWidth / 2,
            shadowY + shadowHeight / 2,
            0,
            shadowX + shadowWidth / 2,
            shadowY + shadowHeight / 2,
            shadowWidth / 2
        );

        gradient.addColorStop(0, `rgba(0, 0, 0, ${this.opacity * 0.4})`);
        gradient.addColorStop(0.5, `rgba(0, 0, 0, ${this.opacity * 0.2})`);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = gradient;

        // Draw ellipse for shadow
        ctx.beginPath();
        ctx.ellipse(
            shadowX + shadowWidth / 2,
            shadowY + shadowHeight / 2,
            shadowWidth / 2,
            shadowHeight / 2,
            0,
            0,
            Math.PI * 2
        );
        ctx.fill();

        ctx.restore();
    },

    reset() {
        this.angle = CONFIG.shadow.defaultAngle;
        this.opacity = CONFIG.shadow.defaultOpacity;
        this.distance = 0.4;
        this.opacitySlider.value = this.opacity * 100;
        this.distanceSlider.value = this.distance * 100;
        this.updateWheelIndicator();
    }
};
