const CONFIG = {
    // Size category thresholds (in cm)
    sizeThresholds: {
        small: { max: 50 },
        medium: { min: 50, max: 90 },
        large: { min: 90 }
    },

    // Background configurations with real-world wall widths (in cm)
    backgrounds: {
        small: {
            path: 'Small.jpg',
            wallWidthCm: 200
        },
        medium: {
            path: 'NewMed.jpg',
            wallWidthCm: 260
        },
        large_wide: {
            path: 'Large-Wide.jpg',
            wallWidthCm: 500
        },
        large_tall: {
            path: 'Large-Tall.jpg',
            wallWidthCm: 500
        }
    },

    // Shadow defaults
    shadow: {
        defaultAngle: 135,
        dropShadowDistance: 20,
        dropShadowBlur: 25,
        floatShadowOffsetY: 10,
        floatShadowBlur: 20,
        defaultOpacity: 0.5
    },

    // localStorage keys
    storage: {
        artworkKey: 'imageplacer_artwork',
        settingsKey: 'imageplacer_settings'
    }
};
