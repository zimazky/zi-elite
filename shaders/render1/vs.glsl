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
out mat3 vInverseTransformMat; // Инверсированная матрица преобразования (для работы SSAO)
out float vAspect; // Соотношение сторон рендербуфера
out float vAspectB; // Соотношение сторон буфера программы B
out float vFocus; // Фокусное расстояние камеры

void main() {
  gl_Position = vec4(aVertexPosition, 1.0);
  float t = tan(0.5*uCameraViewAngle);
  vFocus = 1./t;
  vAspect = uResolution.x/uResolution.y;
  vAspectB = uTextureBResolution.x/uTextureBResolution.y;
  vec2 k = vAspect > vAspectB 
    ? vec2(1, 1./vAspect)
    : vec2(vAspect/vAspectB, 1./vAspectB);

  //vRayScreen = vec3(aVertexPosition.xy*uResolution*t/uResolution.x, -1.);
  //vRay = uTransformMat*vRayScreen;
  vRayScreen = vec3(aVertexPosition.xy*k*t, -1.);
  vRay = uTransformMat * vRayScreen;
  vRaySky = vRay*uSkyTransformMat;
  vInverseTransformMat = inverse(uTransformMat);
}
