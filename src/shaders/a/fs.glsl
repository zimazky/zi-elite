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

in float vTextureBDepth;
//in vec4 vTextureRenderColor;

layout (location = 0) out float fragDepth;
//layout (location = 1) out vec4 fragAlbedo;

void main() {
  vec2 uv = gl_FragCoord.xy/uResolution;
  fragDepth = vTextureBDepth;
  //fragAlbedo = vTextureRenderColor;
}
 