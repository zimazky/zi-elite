#version 300 es

uniform mat4 uProjectMatrix;
uniform vec2 uTextureBResolution;
uniform float uCameraViewAngle;
uniform mat3 uTransformMatrixPrev;
uniform mat3 uTransformMatrix;
uniform vec3 uPositionDelta;


// текстуры
uniform sampler2D uTextureProgramB;

in vec3 aVertexPosition;

out vec3 vTextureBColor;

void main() {
  vec2 uv = 0.5*(vec2(1.)+aVertexPosition.xy);
  vec4 buf = texture(uTextureProgramB, uv);
  vTextureBColor = buf.rgb;

  float t = tan(0.5*uCameraViewAngle);
  vec3 rd = normalize(vec3(aVertexPosition.xy*uTextureBResolution*t/uTextureBResolution.x, -1.));
  vec3 pos = rd*buf.w;
  pos = pos*inverse(uTransformMatrixPrev);
  pos = (pos - uPositionDelta)*uTransformMatrix;

  gl_Position = uProjectMatrix*vec4(pos, 1);

}
