#version 300 es

precision highp float;

/**
 * Шейдер формирования G-буфера ландшафта.
 * Используется предварительная карта глубины, построенная на основании предыдущего кадра.
 */

/** Разрешение экрана */
uniform vec2 uResolution;

/** Текстура с предварительными данными глубины на основе предыдущего кадра */
uniform sampler2D uTextureADepth;

/** Положение камеры */
uniform vec3 uCameraPosition;
/** Вектор направления камеры */
uniform vec3 uCameraDirection;

/** Синус половины углового размера солнца */
uniform float uSunDiscAngleSin;

/**
 * Режим отображения
 * x - режим экрана: 
 *   FRONT_VIEW - вид камеры,
 *   MAP_VIEW - вид карты,
 *   DEPTH_VIEW - вид карты глубины (режим отключен)
 * y - опции отображения карты: 
 *   MAP_ONLY - только карта,
 *   MAP_GRID - показывать сетку,
 *   MAP_HEIGHTS - показывать изолинии высот
 */
uniform vec2 uScreenMode;
/** Масштаб карты */
uniform float uMapScale;

/** Луч в системе координат планеты */
in vec3 vRay;

/** Буфер глубины (w) */
layout (location = 0) out float gDepth;
/** Буфер нормалей (xyz) */
layout (location = 1) out vec3 gNormal;
/** Буфер значений альбедо */
layout (location = 2) out vec4 gAlbedo;

// ----------------------------------------------------------------------------
// Модуль определения констант
// ----------------------------------------------------------------------------
#ifndef CONST_MODULE
#include "src/shaders/common/constants.glsl";
#endif

// ----------------------------------------------------------------------------
// Модуль определения функций расчета пересечения луча с поверхностью
// ----------------------------------------------------------------------------
#ifndef RAYCAST_MODULE
#include "src/shaders/common/Raycasting/Raycast.glsl";
#endif

// ----------------------------------------------------------------------------
// Модуль определения функций биома
// ----------------------------------------------------------------------------
#ifndef BIOME_MODULE
#include "src/shaders/common/Biome/Biome.glsl";
#endif

// ----------------------------------------------------------------------------
// Модуль определения функций отображения карты
// ----------------------------------------------------------------------------
#ifndef MAP_MODULE
#include "./map.glsl";
#endif

// ----------------------------------------------------------------------------
// Формирование G-буфера
// ----------------------------------------------------------------------------


void main(void) {
  vec2 uv = (gl_FragCoord.xy - 0.5*uResolution.xy)/uResolution.x;
  vec3 rd = normalize(vRay);

  #ifdef DEPTH_ERROR_VIEW
  // Режим для просмотра ошибки глубины между расчетным значением и предсказанием на основе предыдущего кадра
  float t0 = 1.;
  #else //DEPTH_ERROR_VIEW
  // Нормальный режим, с испльзованием данных предыдущего кадра
  float t0 = texture(uTextureADepth, gl_FragCoord.xy/uResolution).r;
  #endif //DEPTH_ERROR_VIEW

  vec3 col = vec3(0);
  int raycastIterations = 0;
  float LvsR = step(0.8, gl_FragCoord.x/uResolution.x);
  if(t0 >= MAX_TERRAIN_DISTANCE) {
    gNormal = -rd;
    gDepth = 1.01 * MAX_TERRAIN_DISTANCE;
    //gNormalDepth = vec4(-rd, 1.01 * MAX_TERRAIN_DISTANCE);
  }
  else {
    vec2 uv;
    vec4 nor_t = raycast(uCameraPosition, rd, t0, MAX_TERRAIN_DISTANCE, raycastIterations, uv);
    if(nor_t.w >= MAX_TERRAIN_DISTANCE) {
      gNormal = -rd;
      gDepth = 1.01 * MAX_TERRAIN_DISTANCE;
      //gNormalDepth = vec4(-rd, 1.01 * MAX_TERRAIN_DISTANCE);
    }
    else {
      vec3 pos = uCameraPosition + nor_t.w*rd;
      vec3 nor = nor_t.xyz;
      if(LvsR == 1.) nor = terrainNormal(pos, nor_t.w).xyz;
      gNormal = nor;
      gDepth = nor_t.w;
      //gNormalDepth = nor_t;//vec4(nor, t);
      vec3 lla = lonLatAlt(pos);
      vec3 zenith = terrainZenith(pos);
      col = biomeColor(lla, dot(nor, zenith), uv).rgb;
    }
  }

  #ifdef RAYCAST_ITERATIONS_VIEW
  // Для вывода числа итераций рейтрейсинга
  col = vec3(raycastIterations)/600.;
  #endif
  gAlbedo = vec4(col, 1);
}
 