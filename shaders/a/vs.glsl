#version 300 es

uniform mat4 uProjectMatrix;
uniform vec2 uTextureBResolution;
uniform vec2 uNetResolution;
uniform float uCameraViewAngle;
uniform mat3 uTransformMatrixPrev;
uniform mat3 uTransformMatrix;
uniform vec3 uPositionDelta;


// текстуры
uniform sampler2D uTextureProgramB;

in vec3 aVertexPosition;

out vec4 vTextureBData;

void main() {
  vec2 duv = vec2(1.1)/uNetResolution;
  vec2 uv = 0.5*(vec2(1.)+aVertexPosition.xy);
  vec4 buf = texture(uTextureProgramB, uv);

  // находим мнинмальную глубину по 9-ти точкам (коррекция на краях)

  float wmin = texture(uTextureProgramB, uv+vec2(duv.x, 0)).w;
  wmin = min(wmin, texture(uTextureProgramB, uv-vec2(duv.x, 0)).w);
  wmin = min(wmin, texture(uTextureProgramB, uv+vec2(0, duv.y)).w);
  wmin = min(wmin, texture(uTextureProgramB, uv-vec2(0, duv.y)).w);

  wmin = min(wmin, texture(uTextureProgramB, uv+vec2(duv.x, duv.y)).w);
  wmin = min(wmin, texture(uTextureProgramB, uv+vec2(-duv.x, -duv.y)).w);
  wmin = min(wmin, texture(uTextureProgramB, uv+vec2(duv.x, -duv.y)).w);
  wmin = min(wmin, texture(uTextureProgramB, uv+vec2(-duv.x, duv.y)).w);

  wmin = min(buf.w, wmin);
  buf.w = wmin;

  vTextureBData = vec4(buf.rgb, wmin);

  float t = tan(0.5*uCameraViewAngle);
  vec3 rd = normalize(vec3(aVertexPosition.xy*uTextureBResolution*t/uTextureBResolution.x, -1.));
  vec3 pos = rd*buf.w;
  pos = pos*inverse(uTransformMatrixPrev);
  pos = (pos - uPositionDelta)*uTransformMatrix;

  vTextureBData.w = wmin==0. ? 0. : length(pos);

  gl_Position = uProjectMatrix*vec4(pos, 1);

}
