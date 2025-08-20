precision mediump float;

in vec2 vTextureCoord;
in vec4 vColor;

uniform sampler2D uTexture;

/* Controls:
   uCycle: unbounded time-like value; period = 2.0 (0 night → 1 day → 2 night → …)
   dayTint/nightTint: RGB tints applied over the base texture
   nightStrength: how much additional darkening at night (0..1)
   desaturate: optional desaturation amount at night (0..1)
*/
uniform float uCycle;
uniform vec3  dayTint;
uniform vec3  nightTint;
uniform float nightStrength;
uniform float desaturate;

const float PI = 3.141592653589793;

vec3 applyDesaturate(vec3 c, float amt) {
  // Simple luma-based desaturation
  float luma = dot(c, vec3(0.299, 0.587, 0.114));
  return mix(c, vec3(luma), clamp(amt, 0.0, 1.0));
}

float calculateDayFactor(float phase) {
  // Create realistic day/night cycle timing
  // 0.0-0.1 = Night (10% of cycle)
  // 0.1-0.2 = Sunrise transition (10% of cycle) 
  // 0.2-0.8 = Day (60% of cycle)
  // 0.8-0.9 = Sunset transition (10% of cycle)
  // 0.9-1.0 = Night (10% of cycle)
  // 1.0-2.0 = Repeat pattern
  
  // Normalize to [0,1] range
  float normalizedPhase = mod(phase, 1.0);
  
  if (normalizedPhase < 0.1) {
    // Early night - fully dark
    return 0.0;
  }
  else if (normalizedPhase < 0.2) {
    // Sunrise transition - rapid change from night to day
    float sunriseProgress = (normalizedPhase - 0.1) / 0.1; // 0 to 1
    return smoothstep(0.0, 1.0, sunriseProgress);
  }
  else if (normalizedPhase < 0.8) {
    // Full day - stay bright
    return 1.0;
  }
  else if (normalizedPhase < 0.9) {
    // Sunset transition - rapid change from day to night
    float sunsetProgress = (normalizedPhase - 0.8) / 0.1; // 0 to 1
    return smoothstep(1.0, 0.0, sunsetProgress);
  }
  else {
    // Late night - fully dark
    return 0.0;
  }
}

void main() {
  vec4 base = texture2D(uTexture, vTextureCoord);

  // Wrap into [0,2) range
  float phase = mod(uCycle, 2.0);
  
  // Calculate realistic day factor with short transitions
  float dayfac = calculateDayFactor(phase);

  // Build tint & brightness
  vec3 tint = mix(nightTint, dayTint, dayfac);

  // Night darkening ramps from (1 - nightStrength) at night to 1.0 at day
  float brightness = mix(1.0 - clamp(nightStrength, 0.0, 1.0), 1.0, dayfac);

  // Optional desaturation strongest at night, none at day
  float desatAmt = mix(clamp(desaturate, 0.0, 1.0), 0.0, dayfac);
  vec3 color = applyDesaturate(base.rgb, desatAmt);

  vec3 finalRgb = color * tint * brightness;
  gl_FragColor = vec4(finalRgb, base.a);
}