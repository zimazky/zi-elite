#define TERR_MODULE
// ----------------------------------------------------------------------------
// Генерация ландшафта - пирамиды на плоскости XZ
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// Модуль определения функций модуля планеты
// ----------------------------------------------------------------------------
#ifndef PLANET_MODULE
#include "src/shaders/common/planet.glsl";
#endif

float pyramid(vec2 x) {
  vec2 f = vec2(1) - abs(2.*fract(x)-vec2(1));
  return min(f.x,f.y);
}

const float W_SCALE = 1500.; // масштаб по горизонтали
const float H_SCALE = 1100.; // масштаб по высоте
//const float MAX_TRN_ELEVATION = 1.8*H_SCALE; // максимальная высота

bool isHeightGreaterTerrainMax(vec3 p) {
  return p.y > MAX_TRN_ELEVATION;
}

bool isHeightGreaterTerrainMax(vec3 p, float aPrev) {
  return p.y > aPrev && p.y > MAX_TRN_ELEVATION;
}

// Высота поверхности 
float terrainHeight(vec3 p) {
  return H_SCALE*pyramid(p.xz/W_SCALE);
}

// Высота заданной точки над поверхностью
float terrainAlt(vec3 p) {
  return p.y - terrainHeight(p);
}

// Вычисление нормали под точкой
vec3 terrainNormal(vec3 pos) {
  vec2 eps = vec2(0.1, 0.);
  return normalize(vec3(
    terrainHeight(pos - eps.xyy) - terrainHeight(pos + eps.xyy),
    2.*eps.x,
    terrainHeight(pos - eps.yyx) - terrainHeight(pos + eps.yyx)
  ));
}

// функция определения затененности
float softShadow(vec3 ro, vec3 rd, float dis, out int i, out float t) {
  float minStep = clamp(0.01*dis,10.,500.);
  float cosA = sqrt(1.-rd.z*rd.z); // косинус угла наклона луча от камеры к горизонтали

  float res = 1.;
  t = 0.01*dis;
  float roAlt = lonLatAlt(ro).z;
  for(i=0; i<200; i++) { // меньшее кол-во циклов приводит к проблескам в тени
	  vec3 p = ro + t*rd;
    if(isHeightGreaterTerrainMax(p, roAlt)) return smoothstep(-uSunDiscAngleSin, uSunDiscAngleSin, res);
    float h = terrainAlt(p);
	  res = min(res, cosA*h/t);
    if(res<-uSunDiscAngleSin) return smoothstep(-uSunDiscAngleSin, uSunDiscAngleSin, res);
    t += max(minStep, abs(0.7*h)); // коэффициент устраняет полосатость при плавном переходе тени
  }
  return 0.;
}

vec4 terrainColor(vec3 pos, vec3 nor) {
  return vec4(0.6*pow(vec3(0.5725, 0.4667, 0.4392), vec3(2.2)), 1.);
}