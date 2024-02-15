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
/** Вектор движения */
in vec2 vMotionVector;


layout (location = 0) out float fragDepth;
layout (location = 1) out vec2 fragMotionVector;

// ----------------------------------------------------------------------------
// Модуль определения констант
// ----------------------------------------------------------------------------
#ifndef CONST_MODULE
#include "src/shaders/common/constants.glsl";
#endif


void main() {
  fragDepth = vTextureBDepth > 0.99*uMaxDistance ? MAX_TERRAIN_DISTANCE : vTextureBDepth;
  fragMotionVector = vMotionVector;
}
 