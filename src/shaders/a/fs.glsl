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
/** разрешение текстуры предыдущего кадра */
uniform vec2 uTextureBResolution;

/** текстура предыдущего кадра */
uniform sampler2D uTextureProgramB;

in vec4 vTextureBData;

out vec4 fragColor;

void main() {
  vec2 uv = gl_FragCoord.xy/uResolution;
  fragColor = vTextureBData;
}
 