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

in vec4 vTextureBDepth;
in vec2 vMotionVector;
//in vec4 vTextureRenderColor;

/** Текстура NormalDepth предыдущего кадра */
uniform sampler2D uTextureBDepth;

// x - прогнозируемая глубина
// y - прогнозируемая ошибка
// z - прогнозируемая затененность от солнца
// w - прогнозируемая дальность тени
layout (location = 0) out vec4 fragDepth;
//layout (location = 1) out vec4 fragAlbedo;

// ----------------------------------------------------------------------------
// Модуль определения констант
// ----------------------------------------------------------------------------
#ifndef CONST_MODULE
#include "src/shaders/common/constants.glsl";
#endif


void main() {
  //vec2 uv = gl_FragCoord.xy/uResolution;
  //vec2 shd = texture(uTextureBDepth, uv + vMotionVector).zw;

  fragDepth = vTextureBDepth;
  fragDepth.x = fragDepth.x > 0.99*uMaxDistance ? MAX_TERRAIN_DISTANCE : fragDepth.x;
  //fragDepth.zw = shd;
}
 