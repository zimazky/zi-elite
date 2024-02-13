#version 300 es

precision highp float;

/**
 * Шейдер для формирования буфера с данными глубины на основании
 * данных предыдущего кадра.
 * vTextureBData.w - значение глубины из вершинного шейдера.
 * Можно определять цвет из текстуры предыдущего кадра.
 */

/** разрешение экрана */
uniform vec2 uResolution;
/** Максимальная дистанция по которой обрезается область отрисовки (входит в матрицу проекции) */
uniform float uMaxDistance;

in float vTextureBDepth;
//in vec4 vTextureRenderColor;

// x - прогнозируемая глубина
// y - прогнозируемая ошибка
// z - прогнозируемая затененность от солнца
// w - прогнозируемая дальность тени
layout (location = 0) out float fragDepth;
//layout (location = 1) out vec4 fragAlbedo;

// ----------------------------------------------------------------------------
// Модуль определения констант
// ----------------------------------------------------------------------------
#ifndef CONST_MODULE
#include "src/shaders/common/constants.glsl";
#endif


void main() {
  //vec2 uv = gl_FragCoord.xy/uResolution;
  //fragDepth = mix(vTextureBDepth, MAX_TERRAIN_DISTANCE, step(0.99*uMaxDistance, vTextureBDepth));
  fragDepth = vTextureBDepth > 0.99*uMaxDistance ? MAX_TERRAIN_DISTANCE : vTextureBDepth;
  //fragDepth = vTextureBDepth;

  //fragAlbedo = vTextureRenderColor;
}
 