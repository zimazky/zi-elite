#version 300 es

precision mediump float;

// разрешение экрана
uniform vec2 uResolution;
uniform vec2 uTextureBResolution;

uniform sampler2D uTextureProgramB;

in vec4 vTextureBData;

out vec4 fragColor;

void main() {
  vec2 uv = gl_FragCoord.xy/uResolution;
  fragColor = vTextureBData;
}
 