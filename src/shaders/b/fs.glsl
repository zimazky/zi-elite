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
/** Текстура с векторами движения (разница положений точек текущего и предыдущего кадров) */
uniform sampler2D uTextureAMotionVectors;
/** Текстура нормалей предыдущего кадра */
uniform sampler2D uTextureBNormal;
/** Текстура альбедо предыдущего кадра */
uniform sampler2D uTextureBAlbedo;



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
layout (location = 0) out vec2 gDepth;
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

  float t0 = texture(uTextureADepth, gl_FragCoord.xy/uResolution).x;
  vec3 col = vec3(0);
  int raycastIterations = 0;
  
  float LvsR = step(0.5, gl_FragCoord.x/uResolution.x);
  
  if(t0 >= MAX_TERRAIN_DISTANCE) {
    gNormal = -rd;
    gDepth = vec2(1.01 * MAX_TERRAIN_DISTANCE, 1.);
  }
  else {
    vec2 uv;
    vec4 nor_t = raycast(uCameraPosition, rd, t0, MAX_TERRAIN_DISTANCE, raycastIterations, uv);
    gNormal = nor_t.xyz;
    gDepth = vec2(nor_t.w, (nor_t.w - t0)/nor_t.w);
    if(nor_t.w >= MAX_TERRAIN_DISTANCE) {
      gNormal = -rd;
      gDepth = vec2(1.01 * MAX_TERRAIN_DISTANCE, 1.);
    }
    else {
      vec3 pos = uCameraPosition + nor_t.w*rd;
      //if(LvsR == 1.) gNormal = terrainNormal(pos, nor_t.w).xyz;
      float alt = terrainAlt(pos);
      vec3 zenith = terrainZenith(pos);
      col = biomeColor(dot(nor_t.xyz, zenith), uv, alt).rgb;


      // TAA
      float depthError = (nor_t.w - t0)/nor_t.w;
      if(abs(depthError) < 0.1) {
        vec2 uv2 = gl_FragCoord.xy/uResolution;
        vec2 motionVector = texture(uTextureAMotionVectors, uv2).xy;
        uv2 -= motionVector;
        vec3 normalPrev = texture(uTextureBNormal, uv2).xyz;
        vec3 colPrev = texture(uTextureBAlbedo, uv2).xyz;

        gNormal = normalize(mix(normalPrev, nor_t.xyz, 0.3));
        col = mix(colPrev, col, 0.3);
      }
      //col = vec3(motionVector, 0);
      
    }
  }

  #ifdef RAYCAST_ITERATIONS_VIEW
  // Для вывода числа итераций рейтрейсинга
  col = vec3(raycastIterations)/300.;
  #endif
  gAlbedo = vec4(col, 1);
}
 