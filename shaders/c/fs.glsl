#version 300 es

precision mediump float;

/** 
 * Шейдер для рендеринга полигональных моделей.
 * Используются модель рассеивания Блинна-Фонга.
 */

/* Разрешение фреймбуфера */
uniform vec2 uResolution;

/** Положение камеры */
uniform vec3 uCameraPosition;

/** Цвет зеркального отражения (rgb) и шероховатость (w) поверхности */
//in vec4 vSpecData;
/** Нормаль к поверхности полигона */
in vec4 vNormalDepth;

out vec4 fragColor;

void main() {
  vec2 uv = gl_FragCoord.xy/uResolution;
  // Необходимо написать шейдер для отображения поверхности полигона с учетом диффузного и зеркального отражения 
  
  fragColor = vec4(normalize(vNormalDepth.xyz), vNormalDepth.w);
}
 