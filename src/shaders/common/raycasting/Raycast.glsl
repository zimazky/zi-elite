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
#include "src/shaders/common/terrain/CubeSphereInigoQuilezFBM.glsl";
#endif


#ifdef TERR_FLAT
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
    if(pos.y>ro.y && pos.y>MAX_TRN_ELEVATION) return 1.01 * MAX_TERRAIN_DISTANCE;
    float h = pos.y - terrainHeight(pos);
    if( abs(h)<(0.003*t) || t>tmax ) return t; // двоятся детали при большем значении
    t += 0.4*h; // на тонких краях могут быть артефакты при большом коэффициенте
    if(t>tmax) return 1.01 * MAX_TERRAIN_DISTANCE;
  }
  return t;
}

#else
/** 
 * Рейкастинг для случая сферической поверхности планеты 
 *   ro - положение камеры
 *   rd - направление луча из камеры
 *   tmin - начальное глубина рейтрейсинга
 *   tmax - максимальная глубина рейтрейсинга
 *   i - выходное значение количества циклов рейтрейсинга
 *   возвращает
 *   xyz - нормаль к поверхности
 *   w - дистанция до точки пересечения
 */
vec4 raycast(vec3 ro, vec3 rd, float tmin, float tmax, out int i) {
  float t = tmin;
  float altPrev = lonLatAlt(ro).z;
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
  
  for(i=0; i<600; i++) {
    vec3 pos = ro + t*rd;
    float alt = lonLatAlt(pos).z;
    if(alt>altPrev && alt>=MAX_TRN_ELEVATION) return res;
    altPrev = alt;
    vec4 nor_h = terrainHeightNormal(pos);
    float h = alt - nor_h.w;
    if( abs(h)<(0.0003*t) ) return vec4(nor_h.xyz, t); // двоятся детали при большем значении
    t += 0.5*h; // на тонких краях могут быть артефакты при большом коэффициенте
    if(t>tmax) return res;
  }
  return res; // ПРОВЕРИТЬ
}
#endif

// функция определения затененности
float softShadow(vec3 ro, vec3 rd, float dis, out int i, out float t) {
  float minStep = clamp(0.01*dis,10.,500.);
  float res = 1.;
  t = 0.01*dis;
  float altPrev = lonLatAlt(ro).z;
  for(i=0; i<200; i++) { // меньшее кол-во циклов приводит к проблескам в тени
	  vec3 p = ro + t*rd;
    float rdZenith = dot(rd, terrainZenith(p));
    float cosA = sqrt(1.-rdZenith*rdZenith); // косинус угла наклона луча от камеры к горизонтали
    float alt = lonLatAlt(p).z;
    if(alt>altPrev && alt>=MAX_TRN_ELEVATION) return smoothstep(-uSunDiscAngleSin, uSunDiscAngleSin, res);
    float h = alt - terrainHeight(p);
	  res = min(res, cosA*h/t);
    if(res<-uSunDiscAngleSin) return smoothstep(-uSunDiscAngleSin, uSunDiscAngleSin, res);
    t += max(minStep, abs(0.7*h)); // коэффициент устраняет полосатость при плавном переходе тени
  }
  return 0.;
}
