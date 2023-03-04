#version 300 es

precision mediump float;

uniform vec2 uResolution;
uniform vec2 uTime;
uniform sampler2D uTexture;

out vec4 fragColor;

void main(void) {
  vec2 uv = gl_FragCoord.xy/uResolution;
  fragColor = texture(uTexture, uv);
  //fragColor = vec4(uv.x, uv.y, sin(0.1*uTime.x), 1.0);
}