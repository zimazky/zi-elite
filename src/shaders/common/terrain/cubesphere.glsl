#define TERR_MODULE
// ----------------------------------------------------------------------------
// Генерация ландшафта - пирамиды на кубосфере
// ----------------------------------------------------------------------------


// ----------------------------------------------------------------------------
// Модуль определения функций модуля планеты
// ----------------------------------------------------------------------------
#ifndef PLANET_MODULE
#include "src/shaders/common/planet.glsl";
#endif

const float W_SCALE = 1000.; // масштаб по горизонтали
const float H_SCALE = 1100.; // масштаб по высоте
//const float MAX_TRN_ELEVATION = 1.8*H_SCALE; // максимальная высота


bool isHeightGreaterTerrainMax(vec3 p) {
  vec3 lla = lonLatAlt(p);
  return lla.z > MAX_TRN_ELEVATION;
}

bool isHeightGreaterTerrainMax(vec3 p, float aPrev) {
  vec3 lla = lonLatAlt(p);
  return lla.z > aPrev && lla.z > MAX_TRN_ELEVATION;
}

float pyramidOnCubeSphere(vec3 r) {
  // Размер куба на который проецируется вектор для позиционирования на кубосфере 
  float cubeRad = uPlanetRadius*ONE_OVER_SQRT3;
  vec3 absR = abs(r);
  vec2 f;
  if(absR.x > absR.y) {
    if(absR.x > absR.z) {
      vec3 s = r - r*(r.x-cubeRad)/r.x;
      if(r.x > 0.) f = vec2(s.y, s.z); // x+
      else f = vec2(s.y, s.z); // x-
    }
    else {
      vec3 s = r - r*(r.z-cubeRad)/r.z;
      if(r.z > 0.) f = vec2(s.x, s.y); // z+
      else f = vec2(s.x, s.y); // z-
    }
  }
  else {
    if(absR.y > absR.z) {
      vec3 s = r - r*(r.y-cubeRad)/r.y;
      if(r.y > 0.) f = vec2(s.x, s.z); // y+
      else f = vec2(s.x, s.z); // y-
    }
    else {
      vec3 s = r - r*(r.z-cubeRad)/r.z;
      if(r.z > 0.) f = vec2(s.x, s.y); // z+
      else f = vec2(s.x, s.y); // z-
    }
  }
  f = vec2(1) - abs(2.*fract(f/W_SCALE)-vec2(1));
  return min(f.x, f.y);
}


// Высота на кубосфере в зависимости от декартовых координат точки проецируемой отвесно на сферу 
float terrainHeight(vec3 p) {
  vec3 r = p - uPlanetCenter;
  return H_SCALE * pyramidOnCubeSphere(r);
}

// Высота заданной точки над поверхностью
float terrainAlt(vec3 p) {
  vec3 lla = lonLatAlt(p);
  return lla.z - terrainHeight(p);
}

// Вычисление нормали под точкой
vec3 terrainNormal(vec3 pos) {
  vec2 eps = vec2(1., 0.);
  return normalize(vec3(
    terrainHeight(pos - eps.xyy) - terrainHeight(pos + eps.xyy),
    terrainHeight(pos - eps.yxy) - terrainHeight(pos + eps.yxy),
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