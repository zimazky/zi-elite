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
/** Разрешение текстуры */
uniform vec2 uTextureAResolution;

/** Положение камеры */
uniform vec3 uCameraPosition;
/** Вектор направления камеры */
uniform vec3 uCameraDirection;

/** Цвет и интенсивность света фар: vec3(0.) - выключен */
uniform vec3 uHeadLight;

/** Положение 1-ой сигнальной ракеты */
uniform vec3 uFlare1Position;
/** Цвет и интенсивность света 1-ой сигнальной ракеты */
uniform vec3 uFlare1Light;
/** Положение 2-ой сигнальной ракеты */
uniform vec3 uFlare2Position;
/** Цвет и интенсивность света 2-ой сигнальной ракеты */
uniform vec3 uFlare2Light;

/** Синус половины углового размера солнца */
uniform float uSunDiscAngleSin;
/** Направление на солнце */
uniform vec3 uSunDirection;
/** Цвет и интенсивность света от солнца */
uniform vec3 uSunDiscColor;
/** Цвет и интенсивность света неба */
uniform vec3 uSkyColor;
/** Радиус планеты */
uniform float uPlanetRadius;
/** Положение центра планеты */
uniform vec3 uPlanetCenter;

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
layout (location = 1) out vec3 gAlbedo;

// ----------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------

// View modes
const float FRONT_VIEW = 0.;
const float MAP_VIEW = 1.;
const float DEPTH_VIEW = 2.;
// Map modes
const int MAP_ONLY = 0;
const int MAP_GRID = 1;
const int MAP_HEIGHTS = 2;

// ----------------------------------------------------------------------------
// Модуль определения констант
// ----------------------------------------------------------------------------
#ifndef CONST_MODULE
#include "common/constants.glsl"
#endif

// ----------------------------------------------------------------------------
// Модуль определения функций генерации ландшафта
// ----------------------------------------------------------------------------
#ifndef TERR_MODULE
#include "common/terrain.glsl"
#endif

// ----------------------------------------------------------------------------
// Модуль определения функций отображения карты
// ----------------------------------------------------------------------------
#ifndef MAP_MODULE
#include "b/map.glsl"
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
  /*
  НЕОБХОДИМО ПЕРЕРАБОТАТЬ
  float d = ro.y - MAX_TRN_ELEVATION;
  if(d >= 0.) t = clamp(-d/rd.y, 0., tmax); // поиск стартовой точки, если камера выше поверхности максимальной высоты гор

  for(int i=0; i<300; i++) {
    vec3 pos = ro + t*rd;
    if(pos.y>ro.y && pos.y>MAX_TRN_ELEVATION) return tmax + 1.;
    float h = pos.y - terrainM(pos.xz);
    if( abs(h)<(0.003*t) || t>tmax ) break; // двоятся детали при большем значении
    t += 0.4*h; // на тонких краях могут быть артефакты при большом коэффициенте
  }
  */
  return t;
}

void calcGBuffer(vec3 ro, vec3 rd, float t0)
{
  vec3 col = vec3(0);
  int raycastIterations = 0;
  float t = 2.*MAX_TERRAIN_DISTANCE;
  if(t0>MAX_TERRAIN_DISTANCE) {
    gNormalDepth = vec4(-rd, t);
  }
  else {
    t = raycast(ro, rd, t0, MAX_TERRAIN_DISTANCE, raycastIterations);
    vec3 pos = ro + t*rd;
    gNormalDepth = vec4(calcNormalH(pos, max(200.,t)), t);
    col = terrain_color(pos, nor).rgb;
	}

  #ifdef RAYCAST_ITERATIONS_VIEW
  // Для вывода числа итераций рейтрейсинга
  col = vec3(raycastIterations)/300.;
  #endif

  gAlbedo = col;
}

void main(void) {
  vec2 uv = (gl_FragCoord.xy - 0.5*uResolution.xy)/uResolution.y;
  vec3 rd = normalize(vRay);

  vec2 ts = gl_FragCoord.xy/uResolution;
  vec4 bufA = texture(uTextureProgramA, ts);

  if(uScreenMode.x==MAP_VIEW) {
    gAlbedo = showMap(uCameraPosition, uCameraDirection.xz, uv, int(uScreenMode.y));
    gNormalDepth = vec4(0,0,1,0);
  }
  else {
    #ifdef DEPTH_ERROR_VIEW
    // Режим для просмотра ошибки глубины между расчетным значением и предсказанием на основе предыдущего кадра
    calcGBuffer(uCameraPosition, rd, 1.);
    #else
    // Нормальный режим, с испльзованием данных предыдущего кадра
    calcGBuffer(uCameraPosition, rd, bufA.w);
    #endif
  }
}
 