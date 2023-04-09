#version 300 es

precision mediump float;

// разрешение экрана
uniform vec2 uResolution;

/** Положение камеры */
uniform vec3 uCameraPosition;
/** Направление на солнце */
uniform vec3 uSunDirection;
/** Цвет солнца */
uniform vec3 uSunDiscColor;
/** Цвет неба */
uniform vec3 uSkyColor;
/** Цвет земли */
uniform vec3 uGroundColor;

/** Цвет (rgb) и глубина (w) элемента полигона */
in vec4 vVertexData;
/** Цвет зеркального отражения (rgb) и шероховатость (w) поверхности */
in vec4 vSpecData;
/** Нормаль к поверхности полигона */
in vec3 vNormal;
/** Направление луча из камеры */
in vec3 vRay;

out vec4 fragColor;

void main() {
  vec2 uv = gl_FragCoord.xy/uResolution;
  // Необходимо написать шейдер для отображения поверхности полигона с учетом диффузного и зеркального отражения 

  fragColor = vTextureBData;
}
 