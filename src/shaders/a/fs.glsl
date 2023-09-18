#version 300 es

precision mediump float;

/**
 * Шейдер для формирования буфера с данными глубины на основании
 * данных предыдущего кадра.
 * vTextureBData.w - значение глубины из вершинного шейдера.
 * Можно определять цвет из текстуры предыдущего кадра.
 */

/** разрешение экрана */
uniform vec2 uResolution;

in float vTextureBData;

layout (location = 0) out vec4 fragDepth;

void main() {
  vec2 uv = gl_FragCoord.xy/uResolution;
  fragDepth = vec4(0);
  fragDepth.w = vTextureBData;
}
 