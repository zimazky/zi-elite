#version 300 es

uniform mat4 uProjectMatrix;
uniform vec2 uTextureBResolution;

// текстуры
uniform sampler2D uTextureProgramB;

in vec3 aVertexPosition;

out vec3 vTextureBColor;

void main() {
  vec2 uv = 0.5*(vec2(1.)+aVertexPosition.xy);
  vec4 buf = texture(uTextureProgramB, uv);
  vTextureBColor = buf.rgb;

  //gl_Position = vec4(aVertexPosition.x, aVertexPosition.y, -buf.w, 1.0);
  gl_Position = vec4(aVertexPosition.xy, -buf.w/65000., 1.0);

}
