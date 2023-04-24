#version 300 es

precision mediump float;

/** 
 * Шейдер для построения карты высот с целью ускорения расчета теней
 */

/* Разрешение фреймбуфера */
uniform vec2 uResolution;

/** Положение центра карты высот */
uniform vec2 uMapPosition;
/** 
 * Изменение положения центра карты высот
 * если 0,0 то расчет не нужен;
 * если сдвиг по любой координате больше ширины карты, то полный пересчет;
 * иначе сдвигаем данные и расчитываем недостающие
 */
uniform vec2 uMapPositionDelta;
/** Масштаб карты высот (размер от центра карты до края в метрах */
uniform float uScale;


/** Текстура карты высот и теней, рассчитанная ранее */
uniform sampler2D uTextureProgramD;

in vec2 vCoordinates;

/** Карта высот */
layout (location = 0) out float oHeight;

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
  vec2 uv0 = uv + 0.5*uMapPositionDelta/uScale;

  if(uv0.x < 0. || uv0.x > 1. || uv0.y < 0. || uv0.y > 1.) oHeight = terrainM(vCoordinates);
  else oHeight = texture(uTextureProgramD, uv0).r;
}
 