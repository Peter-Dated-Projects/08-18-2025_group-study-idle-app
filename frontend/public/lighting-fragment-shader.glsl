precision mediump float;

in vec2 vTextureCoord;
in vec2 vWorldPos;

uniform sampler2D uTexture;
uniform sampler2D uShadowMap;

// Up to 8 lights
uniform vec2 uLightPositions[8];
uniform vec3 uLightColors[8];
uniform float uLightRadii[8];
uniform float uLightIntensities[8];
uniform int uNumLights;

// Ambient lighting
uniform float uAmbientStrength;
uniform vec3 uAmbientColor;

void main() {
    vec4 baseColor = texture2D(uTexture, vTextureCoord);
    vec3 totalLight = vec3(0.0);
    
    // Calculate lighting from all light sources
    for (int i = 0; i < 8; i++) {
        if (i >= uNumLights) break;
        
        vec2 lightPos = uLightPositions[i];
        vec3 lightColor = uLightColors[i];
        float lightRadius = uLightRadii[i];
        float lightIntensity = uLightIntensities[i];
        
        // Calculate distance and attenuation
        float distance = length(vWorldPos - lightPos);
        float attenuation = 1.0 - smoothstep(0.0, lightRadius, distance);
        
        // Sample shadow map for this light
        // Convert world position to shadow map coordinates (0-1 range)
        vec2 shadowCoord = vWorldPos / 512.0; // Assuming 512x512 shadow map
        float shadowValue = texture2D(uShadowMap, shadowCoord).r;
        
        // Apply lighting with shadow
        totalLight += lightColor * lightIntensity * attenuation;// * shadowValue;
    }
    
    // Add ambient lighting
    vec3 ambientLight = uAmbientColor * uAmbientStrength;
    vec3 finalLight = ambientLight + totalLight;
    
    // Apply lighting to base color
    vec3 litColor = baseColor.rgb * finalLight;
    gl_FragColor = vec4(litColor, baseColor.a);
}
