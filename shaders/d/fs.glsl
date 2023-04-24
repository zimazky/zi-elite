#version 300 es

precision mediump float;

/** 
 * Шейдер для построения карты теней
 */

/* Разрешение фреймбуфера */
uniform vec2 uResolution;

/** Положение центра карты высот */
uniform vec2 uMapPosition;
/** Масштаб карты высот (размер от центра карты до края в метрах */
uniform float uScale;


/** Текстура карты высот, рассчитанная ранее */
uniform sampler2D uTextureProgramC;

in vec2 vCoordinates;

/** Карта высот и теней */
layout (location = 0) out vec2 oHeightShadow;

// ----------------------------------------------------------------------------
// Модуль определения констант
// ----------------------------------------------------------------------------
#ifndef CONST_MODULE
#include "common/constants.glsl"
#endif

const float uSunDiscAngleSin = 0.;
// ----------------------------------------------------------------------------
// Модуль определения функций генерации ландшафта
// ----------------------------------------------------------------------------
#ifndef TERR_MODULE
#include "common/terrain.glsl"
#endif

void main() {
  vec2 uv = gl_FragCoord.xy/uResolution;

  oHeightShadow = vec2(texture(uTextureProgramC, uv).r, 0);
}
 