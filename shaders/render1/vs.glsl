#version 300 es

// разрешение экрана
uniform mediump vec2 uResolution;

uniform mat3 uTransformMat;
uniform mat3 uSkyTransformMat;
uniform mediump float uCameraViewAngle;

in vec3 aVertexPosition;

out vec3 vRay;    // Лучи в системе координат планеты
out vec3 vRaySky; // Лучи в системе координат небесного свода
out vec3 vRayScreen; // Лучи в экранной системе координат

void main() {
  gl_Position = vec4(aVertexPosition, 1.0);
  float t = tan(0.5*uCameraViewAngle);
  vRayScreen = vec3(aVertexPosition.xy*uResolution*t/uResolution.x, -1.);
  vRay = uTransformMat*vRayScreen;
  vRaySky = vRay*uSkyTransformMat;
}
