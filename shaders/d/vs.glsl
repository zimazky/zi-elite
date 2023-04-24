#version 300 es

/** 
 * Шейдер для построения карты высот с целью ускорения расчета теней
 */

/** Положение центра карты высот */
uniform vec2 uMapPosition;
/** Масштаб карты высот (размер от центра карты до края в метрах */
uniform mediump float uScale;

in vec3 aVertexPosition;

out vec2 vCoordinates;

void main() {
  gl_Position = vec4(aVertexPosition, 1);
  vCoordinates = aVertexPosition.xy*uScale;
}
