#version 300 es

// разрешение экрана
uniform mediump vec2 uResolution;
uniform mediump vec2 uTextureBResolution;

uniform mat3 uTransformMat;
uniform mat3 uSkyTransformMat;
uniform mediump float uCameraViewAngle;

in vec3 aVertexPosition;

out vec3 vRay;    // Лучи в системе координат планеты
out vec3 vRaySky; // Лучи в системе координат небесного свода
out vec3 vRayScreen; // Лучи в экранной системе координат
out mat3 vInverseTransformMat;

void main() {
  gl_Position = vec4(aVertexPosition, 1.0);
  float t = tan(0.5*uCameraViewAngle);
  float aspect = uResolution.x/uResolution.y;
  float aspectB = uTextureBResolution.x/uTextureBResolution.y;
  vec2 k = aspect > aspectB 
    ? vec2(1, aspectB/aspect)
    : vec2(aspect/aspectB, 1);

  vRayScreen = vec3(aVertexPosition.xy*uResolution*t/uResolution.x, -1.);
  vRay = uTransformMat*vRayScreen;
  vRaySky = vRay*uSkyTransformMat;
  vInverseTransformMat = inverse(uTransformMat);
}
