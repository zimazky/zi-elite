#version 300 es

uniform mat3 uTransformMat;
uniform mat3 uSkyTransformMat;
//uniform mediump float uCameraViewAngle;
//uniform mediump vec2 uResolution;
uniform lowp float uCameraViewAngle;
uniform lowp vec2 uResolution;

in vec3 aVertexPosition;

out vec3 vRay;    // Лучи в системе координат планеты
out vec3 vRaySky; // Лучи в системе координат небесного свода

void main(void) {
  gl_Position = vec4(aVertexPosition, 1.0);
  float t = tan(0.5*uCameraViewAngle);
  vRay = uTransformMat*vec3(aVertexPosition.xy*uResolution*t/uResolution.x, -1.);
  vRaySky = vRay*uSkyTransformMat;
}
