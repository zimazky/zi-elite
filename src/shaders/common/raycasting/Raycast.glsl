#define RAYCAST_MODULE
// ----------------------------------------------------------------------------
// Функции расчета пересечения луча с поверхностью
// ----------------------------------------------------------------------------



// ----------------------------------------------------------------------------
// Модуль определения констант
// ----------------------------------------------------------------------------
#ifndef CONST_MODULE
#include "src/shaders/common/constants.glsl";
#endif

// ----------------------------------------------------------------------------
// Модуль определения функций генерации ландшафта
// ----------------------------------------------------------------------------
#ifndef TERR_MODULE
#include "src/shaders/common/terrain/CubeSphereFBM.glsl";
//include "src/shaders/common/terrain/FlatFBM.glsl";
#endif


#ifdef TERR_FLAT
/** 
 * Рейкастинг для случая плоской поверхности планеты
 *   ro - положение камеры
 *   rd - направление луча из камеры
 *   tmin - начальное глубина рейтрейсинга
 *   tmax - максимальная глубина рейтрейсинга
 *   i - выходное значение количества циклов рейтрейсинга
 *   uv - выходное значение текстурные координаты на плоскости
 *   возвращает
 *   xyz - нормаль к поверхности
 *   w - дистанция до точки пересечения
 */
vec4 raycast(vec3 ro, vec3 rd, float tmin, float tmax, out int i, out vec2 uv) {
  float t = tmin;
  uv = ro.xz;
  vec4 res = vec4(-rd, 1.01 * MAX_TERRAIN_DISTANCE);

  float d = ro.y - MAX_TRN_ELEVATION;
  if(d >= 0.) t = clamp(-d/rd.y, t, tmax); // поиск стартовой точки, если камера выше поверхности максимальной высоты гор

  vec4 nor_h;
  for(i=0; i<300; i++) {
    vec3 pos = ro + t*rd;
    if(pos.y>ro.y && pos.y>MAX_TRN_ELEVATION) return res;
    nor_h = terrainHeightNormal(pos, t, uv);
    float h = pos.y - nor_h.w;
    if( abs(h)<max(0.1, 0.003*t) ) return vec4(nor_h.xyz, t); // двоятся детали при большем значении
    t += 0.2*h; // на тонких краях могут быть артефакты при большом коэффициенте
    if(t>tmax) return res;
  }
  return t<1000. ? vec4(nor_h.xyz, t) : res;
  //return vec4(nor_h.xyz, t);
}

#else
/** 
 * Рейкастинг для случая сферической поверхности планеты 
 *   ro - положение камеры
 *   rd - направление луча из камеры
 *   tmin - начальное глубина рейтрейсинга
 *   tmax - максимальная глубина рейтрейсинга
 *   i - выходное значение количества циклов рейтрейсинга
 *   uv - выходное значение текстурные координаты на сфере
 *   возвращает
 *   xyz - нормаль к поверхности
 *   w - дистанция до точки пересечения
 */
vec4 raycast(vec3 ro, vec3 rd, float tmin, float tmax, out int i, out vec2 uv) {
  float t = tmin;
  float altPrev = terrainAlt(ro);
  vec4 res = vec4(-rd, 1.01 * MAX_TERRAIN_DISTANCE);

  if(altPrev > MAX_TRN_ELEVATION) {
    vec3 r = uPlanetCenter - ro;
    float OT = dot(rd, r);
    if(OT < 0.) return res; // луч уходит от планеты
    float CO = length(r);
    float CT2 = CO*CO - OT*OT;
    float R = uPlanetRadius + MAX_TRN_ELEVATION;
    float R2 = R*R;
    if(CT2 >= R2) return res; // луч не пересекается со сферой
    float AT = sqrt(R2 - CT2);
    t = max(tmin, OT-AT);
  }
  vec4 nor_h;
  for(i=0; i<300; i++) {
    vec3 pos = ro + t*rd;
    float alt = terrainAlt(pos);
    if(alt>altPrev && alt>=MAX_TRN_ELEVATION) return res;
    altPrev = alt;
    nor_h = terrainHeightNormal(pos, t, uv);
    float h = alt - nor_h.w;
    if( abs(h)<max(0.04,0.002*t) ) return vec4(nor_h.xyz, t); // двоятся детали при большем значении
    t += 0.4*h; // на тонких краях могут быть артефакты при большом коэффициенте
  }
  return vec4(nor_h.xyz, t);
}
#endif

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
*/

/** 
 * Функция определения затененности солнечного света (устаревший вариант с возможностью полузатенения когда h<0)
 *   ro - положение точки, для которой определяется затенение
 *   rd - направление луча из точки в направлении солнца
 *   //tmin - начальное глубина рейтрейсинга
 *   //tmax - максимальная глубина рейтрейсинга
 *   возвращает значение от 0 до 1, 0 - тень, 1 - на свету
 *   i - количество итераций
 *   t - дистанция до точки пересечения
 */
float softShadow(vec3 ro, vec3 rd, float dis, float shadowDist, out int i, out float t) {
  float res = 1.;
  float tlocal = max(0.002*dis, shadowDist);
  float tlocalPrev = shadowDist;
  t = tlocalPrev;
  for(i=0; i<300; i++) { // меньшее кол-во циклов приводит к проблескам в тени
	  vec3 p = ro + tlocal*rd;
    float alt = terrainAlt(p);
    if(alt>=MAX_TRN_ELEVATION) return smoothstep(-uSunDiscAngleSin, uSunDiscAngleSin, res);
    float h = alt - terrainHeight(p);
    float rdZenith = dot(rd, terrainZenith(p));
    float cosA = sqrt(1.-rdZenith*rdZenith)*h/tlocal; // косинус угла наклона луча от камеры к горизонтали * h/tlocal
    if(cosA < res) {
      t = tlocalPrev;
      res = cosA;
    }
    if(res < -uSunDiscAngleSin) {
      t = tlocalPrev;
      return 0.;
    }
    tlocalPrev = tlocal;
    tlocal += max(20., abs(0.8*h)); // коэффициент устраняет полосатость при плавном переходе тени
  }
  return smoothstep(-uSunDiscAngleSin, uSunDiscAngleSin, res);
}

/** 
 * Функция определения затененности солнечного света (вариант с h>0)
 *   ro - положение точки, для которой определяется затенение
 *   rd - направление луча из точки в направлении солнца
 *   //tmin - начальное глубина рейтрейсинга
 *   //tmax - максимальная глубина рейтрейсинга
 *   возвращает значение от 0 до 1, 0 - тень, 1 - на свету
 *   i - количество итераций
 *   t - дистанция до точки пересечения
 */
float softShadowZero(vec3 ro, vec3 rd, float dis, float shadowDist, out int i, out float t) {
  float res = 1.;
  float tlocal = max(0.002*dis, shadowDist);
  t = shadowDist;
  for(i=0; i<300; i++) { // меньшее кол-во циклов приводит к проблескам в тени
	  vec3 p = ro + tlocal*rd;
    float alt = terrainAlt(p);
    if(alt>=MAX_TRN_ELEVATION) return smoothstep(0., 2.*uSunDiscAngleSin, res);
    float h = alt - terrainHeight(p);
    if(abs(h) < max(0.04, 0.002*tlocal)) { t = tlocal; return 0.; }
    float rdZenith = dot(rd, terrainZenith(p));
    float cosA = sqrt(1.-rdZenith*rdZenith)*h/tlocal; // косинус угла наклона луча от камеры к горизонтали * h/tlocal
    if(cosA < res) { t = tlocal; res = cosA; }
    tlocal += 0.8*h; // коэффициент устраняет полосатость при плавном переходе тени
  }
  return smoothstep(0., 2.*uSunDiscAngleSin, res);
}
