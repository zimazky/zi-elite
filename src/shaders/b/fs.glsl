#version 300 es

precision mediump float;

/**
 * Шейдер формирования G-буфера ландшафта.
 * Используется предварительная карта глубины, построенная на основании предыдущего кадра.
 */

/** Разрешение экрана */
uniform vec2 uResolution;

/** Текстура с предварительными данными глубины на основе предыдущего кадра */
uniform sampler2D uTextureProgramA;

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
#include "../common/constants.glsl";
#endif

// ----------------------------------------------------------------------------
// Модуль определения функций генерации ландшафта
// ----------------------------------------------------------------------------
#ifndef TERR_MODULE
#include "../common/terrain.glsl";
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

/*
// Перевод декартовых координат точки в сферические координаты относительно центра планеты
// Начало декартовых координат совпадает с точкой 0,0,0 на сфере
// Ось x 
// Возвращается:
// x - долгота
// y - широта
// z - высота над поверхностью сферы
vec3 lonLatAlt(vec3 p) {
  vec3 r = p - uPlanetCenter;
  float phi = atan(r.y, r.x);
  float theta = atan(length(r.xy), r.z);
  float alt = length(r) - uPlanetRadius;
  return vec3(phi, theta, alt);
}
*/

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
  // НАЙТИ ТОЧКУ ПЕРЕСЕЧЕНИЯ
  //float d = ro.y - MAX_TRN_ELEVATION;
  //if(d >= 0.) t = clamp(-d/rd.y, 0., tmax); // поиск стартовой точки, если камера выше поверхности максимальной высоты гор
  //float roAlt = length(ro) - uPlanetRadius;
  for(int i=0; i<300; i++) {
    vec3 pos = ro + t*rd;
    vec3 lla = lonLatAlt(pos);
    //if(lla.z>roAlt && lla.z>MAX_TRN_ELEVATION) return tmax + 1.;
    float h = lla.z - terrainOnSphere(lla.xy);
    if( abs(h)<(0.003*t) || t>tmax ) break; // двоятся детали при большем значении
    t += 0.4*h; // на тонких краях могут быть артефакты при большом коэффициенте
  }
  return t;
}

void main(void) {
  vec2 uv = (gl_FragCoord.xy - 0.5*uResolution.xy)/uResolution.x;
  vec3 rd = normalize(vRay);

  if(uScreenMode.x == MAP_VIEW) {
    // Режим отображения карты
    vec4 norDepth;
    //gAlbedo = vec4(showMap(uCameraPosition, uCameraDirection.xz, uv, int(uScreenMode.y), norDepth), 1);
    gNormalDepth = norDepth;
  }
  else {
    #ifdef DEPTH_ERROR_VIEW
    // Режим для просмотра ошибки глубины между расчетным значением и предсказанием на основе предыдущего кадра
    float t0 = 1.;
    #else
    // Нормальный режим, с испльзованием данных предыдущего кадра
    float t0 = texture(uTextureProgramA, gl_FragCoord.xy/uResolution).w;
    #endif

    vec3 col = vec3(0);
    int raycastIterations = 0;
    float t = 2.*MAX_TERRAIN_DISTANCE;
    vec3 pos = uCameraPosition + t*rd;
    if(t0 > MAX_TERRAIN_DISTANCE) {
      gNormalDepth = vec4(-rd, t);
    }
    else {
      t = raycastSpheric(uCameraPosition, rd, t0, MAX_TERRAIN_DISTANCE, raycastIterations);
      if(t > MAX_TERRAIN_DISTANCE) {
        gNormalDepth = vec4(-rd, 2.*MAX_TERRAIN_DISTANCE);
      }
      else {
        pos = uCameraPosition + t*rd;
        vec3 lla = lonLatAlt(pos);
        vec3 nor = calcNormal(pos, max(1.,t));
        gNormalDepth = vec4(nor, t);
        col = terrain_color(pos, nor).rgb;
      }
    }

    #ifdef RAYCAST_ITERATIONS_VIEW
    // Для вывода числа итераций рейтрейсинга
    col = vec3(raycastIterations)/300.;
    #endif
    gAlbedo = vec4(col, 1);
  }
}
 