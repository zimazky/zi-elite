#version 300 es

precision highp float;

/**
 * Шейдер рендеринга ландшафта.
 * Используется предварительная карта глубины, построенная на основании предыдущего кадра.
 */

/** Матрица вращения камеры */
uniform mat3 uTransformMat;
/** Угол обзора камеры по горизонтали */
uniform float uCameraViewAngle;
/** Разрешение фреймбуфера */
uniform vec2 uResolution;

in vec3 aVertexPosition;

/** Лучи в системе координат планеты */
out vec3 vRay;

void main(void) {
  gl_Position = vec4(aVertexPosition, 1.0);
  float t = tan(0.5*uCameraViewAngle);
  vRay = uTransformMat*vec3(aVertexPosition.xy*uResolution*t/uResolution.x, -1.);
}
