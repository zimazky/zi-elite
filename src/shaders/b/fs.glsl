#version 300 es

precision mediump float;

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

/** Буфер нормалей (xyz) и глубины (w) */
layout (location = 0) out vec4 gNormalDepth;
/** Буфер значений альбедо */
layout (location = 1) out vec4 gAlbedo;

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
#include "src/shaders/common/raycasting/Raycast.glsl";
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

/** 
 * Рейкастинг для случая плоской поверхности планеты
 *   ro - положение камеры
 *   rd - направление луча из камеры
 *   tmin - начальное глубина рейтрейсинга
 *   tmax - максимальная глубина рейтрейсинга
 *   i - выходное значение количества циклов рейтрейсинга
 */
 /*
float raycast(vec3 ro, vec3 rd, float tmin, float tmax, out int i) {
  float t = tmin;
  float d = ro.y - MAX_TRN_ELEVATION;
  if(d >= 0.) t = clamp(-d/rd.y, t, tmax); // поиск стартовой точки, если камера выше поверхности максимальной высоты гор

  for(i=0; i<300; i++) {
    vec3 pos = ro + t*rd;
    if(pos.y>ro.y && pos.y>MAX_TRN_ELEVATION) return tmax + 1.;
    float h = pos.y - terrainM(pos.xz);
    if( abs(h)<(0.003*t) || t>tmax ) break; // двоятся детали при большем значении
    t += 0.4*h; // на тонких краях могут быть артефакты при большом коэффициенте
  }
  return t;
}
*/

bool isIntersectMaxTerrain(vec3 ro, vec3 rd, out float dist) {
  float alt = lonLatAlt(ro).z;
  dist = 0.;
  if(alt < MAX_TRN_ELEVATION) return true;
  vec3 r = uPlanetCenter - ro;
  float OT = dot(rd, r);
  if(OT < 0.) return false; // луч уходит от планеты
  float CO = length(r);
  float CT2 = CO*CO - OT*OT;
  float R = uPlanetRadius + MAX_TRN_ELEVATION;
  float R2 = R*R;
  if(CT2 >= R2) return false; // луч не пересекается со сферой
  float AT = sqrt(R2 - CT2);
  dist = OT-AT;
  return true;
}

/** 
 * Рейкастинг для случая сферической поверхности планеты 
 *   ro - положение камеры
 *   rd - направление луча из камеры
 *   tmin - начальное глубина рейтрейсинга
 *   tmax - максимальная глубина рейтрейсинга
 *   i - выходное значение количества циклов рейтрейсинга
 */
float raycastSpheric(vec3 ro, vec3 rd, float tmin, float tmax, out int i) {
  float t = tmin;
  float altPrev = lonLatAlt(ro).z;

  if(altPrev > MAX_TRN_ELEVATION) {
    vec3 r = uPlanetCenter - ro;
    float OT = dot(rd, r);
    if(OT < 0.) return 1.01 * MAX_TERRAIN_DISTANCE; // луч уходит от планеты
    float CO = length(r);
    float CT2 = CO*CO - OT*OT;
    float R = uPlanetRadius + MAX_TRN_ELEVATION;
    float R2 = R*R;
    if(CT2 >= R2) return 1.01 * MAX_TERRAIN_DISTANCE; // луч не пересекается со сферой
    float AT = sqrt(R2 - CT2);
    t = max(tmin, OT-AT);
    tmax += t;
  }
  
  for(i=0; i<600; i++) {
    vec3 pos = ro + t*rd;
    float alt = lonLatAlt(pos).z;
    if(alt>altPrev && alt>=MAX_TRN_ELEVATION) return 1.01 * MAX_TERRAIN_DISTANCE;
    altPrev = alt;
    float h = alt - terrainHeight(pos, t);
    if( abs(h)<(0.003*t) ) return t; // двоятся детали при большем значении
    t += 0.5*h; // на тонких краях могут быть артефакты при большом коэффициенте
    if(t>tmax) return 1.01 * MAX_TERRAIN_DISTANCE;
  }
  return t;
}

void main(void) {
  vec2 uv = (gl_FragCoord.xy - 0.5*uResolution.xy)/uResolution.x;
  vec3 rd = normalize(vRay);

  if(uScreenMode.x == MAP_VIEW) {
    // Режим отображения карты
    vec4 norDepth = vec4(0);
    //gAlbedo = vec4(showMap(uCameraPosition, uCameraDirection.xz, uv, int(uScreenMode.y), norDepth), 1);
    gNormalDepth = norDepth;
    return;
  }
  #ifdef DEPTH_ERROR_VIEW
  // Режим для просмотра ошибки глубины между расчетным значением и предсказанием на основе предыдущего кадра
  float t0 = 1.;
  #else
  // Нормальный режим, с испльзованием данных предыдущего кадра
  float t0 = texture(uTextureADepth, gl_FragCoord.xy/uResolution).r;
  #endif

  vec3 col = vec3(0);
  int raycastIterations = 0;
  float LvsR = step(0.5, gl_FragCoord.x/uResolution.x);
  if(t0 >= MAX_TERRAIN_DISTANCE) {
    gNormalDepth = vec4(-rd, 1.01 * MAX_TERRAIN_DISTANCE);
  }
  else {
    vec4 nor_t = raycast(uCameraPosition, rd, t0, MAX_TERRAIN_DISTANCE, raycastIterations);
    if(nor_t.w >= MAX_TERRAIN_DISTANCE) {
      gNormalDepth = vec4(-rd, 1.01 * MAX_TERRAIN_DISTANCE);
    }
    else {
      vec3 pos = uCameraPosition + nor_t.w*rd;
      vec3 nor = nor_t.xyz;
      //vec3 nor = mix(nor_t.xyz, terrainNormal(pos).xyz, LvsR);
      gNormalDepth = nor_t;//vec4(nor, t);
      vec3 lla = lonLatAlt(pos);
      vec3 zenith = terrainZenith(pos);
      col = biomeColor(lla, dot(nor, zenith)).rgb;
    }
  }

  #ifdef RAYCAST_ITERATIONS_VIEW
  // Для вывода числа итераций рейтрейсинга
  col = vec3(raycastIterations)/600.;
  #endif
  gAlbedo = vec4(col, 1);
}
 