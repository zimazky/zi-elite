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
  vec2 duv = vec2(1.5)/uNetResolution;
  vec2 uv = 0.5*(vec2(1.)+aVertexPosition.xy);
  vec4 buf = texture(uTextureProgramB, uv);

  // находим мнинмальную глубину по 9-ти точкам (коррекция на разрывах глубины)
  float wmin = texture(uTextureProgramB, uv+vec2(duv.x, 0)).w;
  wmin = min(wmin, texture(uTextureProgramB, uv-vec2(duv.x, 0)).w);
  wmin = min(wmin, texture(uTextureProgramB, uv+vec2(0, duv.y)).w);
  wmin = min(wmin, texture(uTextureProgramB, uv-vec2(0, duv.y)).w);

  wmin = min(wmin, texture(uTextureProgramB, uv+vec2(duv.x, duv.y)).w);
  wmin = min(wmin, texture(uTextureProgramB, uv+vec2(-duv.x, -duv.y)).w);
  wmin = min(wmin, texture(uTextureProgramB, uv+vec2(duv.x, -duv.y)).w);
  wmin = min(wmin, texture(uTextureProgramB, uv+vec2(-duv.x, duv.y)).w);

  buf.w = min(buf.w, wmin);
  vTextureBData = buf;

  float t = tan(0.5*uCameraViewAngle);
  vec3 rd = normalize(vec3(aVertexPosition.xy*uTextureBResolution*t/uTextureBResolution.x, -1.));
  vec3 pos = rd*buf.w;

  pos = pos*inverse(uTransformMatrixPrev);
  pos = (pos - uPositionDelta)*uTransformMatrix;

  //vTextureBData.w = buf.w==0. ? 0. : length(pos);
  vTextureBData.w = length(pos);

  // при движении назад по краям устанавливаем глубину 0
  vec3 deltaPos = uPositionDelta*uTransformMatrix;
  if(deltaPos.z > 0. && (uv.y <= duv.y || uv.y >= 1.-duv.y || uv.x <= duv.x || uv.x >= 1.-duv.x)) vTextureBData.w = 0.;

  gl_Position = uProjectMatrix*vec4(pos, 1);

}
