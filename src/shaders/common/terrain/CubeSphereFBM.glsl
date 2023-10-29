#define TERR_MODULE
// ----------------------------------------------------------------------------
// Генерация ландшафта - FBM на кубосфере
// ----------------------------------------------------------------------------


// Радиус планеты
uniform float uPlanetRadius;
// Положение центра планеты
uniform vec3 uPlanetCenter;

const float W_SCALE = 3000.; // масштаб по горизонтали
const float H_SCALE = 1100.; // масштаб по высоте
const float MAX_TRN_ELEVATION = 1.9*H_SCALE; // максимальная высота

// ----------------------------------------------------------------------------
// Модуль расчета фрактального шума
// ----------------------------------------------------------------------------
#ifndef FBMNOISE_MODULE
#include "src/shaders/common/Noise/FbmRidged2.glsl";
//include "src/shaders/common/Noise/FbmInigoQuilez.glsl";
#endif


// Перевод декартовых координат точки в сферические координаты относительно центра планеты
// Начало декартовых координат совпадает с точкой 0,0,0 на сфере
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

const float nScale = H_SCALE/W_SCALE;
// p - координаты точки
// dist - дистанция от камеры до точки
// uv - выходное значение текстурных кординат
// возвращает:
// xyz - нормаль
// w - высота
// uv - текстурные координаты на кубе
vec4 height_d(vec3 p, float dist, out vec2 uvCoord) {
  // Размер куба на который проецируется вектор для позиционирования на кубосфере
  float cubeRad = uPlanetRadius*ONE_OVER_SQRT3;
  vec3 r = p - uPlanetCenter;
  vec3 absR = abs(r);
  vec4 h_d;
  if(absR.x > absR.y) {
    if(absR.x > absR.z) {
      vec3 s = p - (uPlanetCenter + r*(absR.x-cubeRad)/absR.x);
      uvCoord = s.yz;
      h_d = terrainFbm(s.yz/W_SCALE, dist);
      h_d.z /= nScale;
      // Матрица преобразования нормалей из касательного пространства относительно сферы к объектному пространству
      //  [    d    0  u/d ]
      //  [    0    d  v/d ]
      //  [ -d*u -d*v  1/d ]
      //
      // d = sqrt(u*u + v*v + 1)
      // u,v - координаты на плоскостях куба в диапазоне (-1..1)
      // u = sqrt(3)*x/R
      // v = sqrt(3)*y/R
      vec2 uv = s.yz/cubeRad;
      float d = sqrt(dot(uv,uv)+1.);
      mat3 m = mat3(d, 0, uv.x/d, 0, d, uv.y/d, -d*uv.x, -d*uv.y, 1./d);
      h_d.xyz = h_d.xyz * m;
      h_d.xyz = h_d.zxy; // x+
      if(r.x < 0.) h_d.x = -h_d.x; // x-
    }
    else {
      vec3 s = p - (uPlanetCenter + r*(absR.z-cubeRad)/absR.z);
      uvCoord = s.xy;
      h_d = terrainFbm(s.xy/W_SCALE, dist);
      h_d.z /= nScale;
      vec2 uv = s.xy/cubeRad;
      float d = sqrt(dot(uv,uv)+1.);
      mat3 m = mat3(d, 0, uv.x/d, 0, d, uv.y/d, -d*uv.x, -d*uv.y, 1./d);
      h_d.xyz = h_d.xyz * m;
      //h_d.xyz = h_d.xyz; // z+
      if(r.z < 0.) h_d.z = -h_d.z; // z-
    }
  }
  else {
    if(absR.y > absR.z) {
      vec3 s = p - (uPlanetCenter + r*(absR.y-cubeRad)/absR.y);
      uvCoord = s.xz;
      h_d = terrainFbm(s.xz/W_SCALE, dist);
      h_d.z /= nScale;
      vec2 uv = s.xz/cubeRad;
      float d = sqrt(dot(uv,uv)+1.);
      mat3 m = mat3(d, 0, uv.x/d, 0, d, uv.y/d, -d*uv.x, -d*uv.y, 1./d);
      h_d.xyz = h_d.xyz * m;
      h_d.xyz = h_d.xzy; // y+
      if(r.y < 0.) h_d.y = -h_d.y; // y-
    }
    else {
      vec3 s = p - (uPlanetCenter + r*(absR.z-cubeRad)/absR.z);
      uvCoord = s.xy;
      h_d = terrainFbm(s.xy/W_SCALE, dist);
      h_d.z /= nScale;
      vec2 uv = s.xy/cubeRad;
      float d = sqrt(dot(uv,uv)+1.);
      mat3 m = mat3(d, 0, uv.x/d, 0, d, uv.y/d, -d*uv.x, -d*uv.y, 1./d);
      h_d.xyz = h_d.xyz * m;
      //h_d.xyz = h_d.xyz; // z+
      if(r.z < 0.) h_d.z = -h_d.z; // z-
    }
  }
  return vec4(normalize(h_d.xyz), H_SCALE*h_d.w);
}

// Высота на кубосфере в зависимости от декартовых координат точки проецируемой отвесно на сферу 
float terrainHeight(vec3 p, float dist) {
  //vec3 r = p - uPlanetCenter;
  vec2 uv;
  vec4 h_d = height_d(p, dist, uv);
  return h_d.w;
}

// Высота и нормаль на кубосфере в зависимости от декартовых координат точки проецируемой отвесно на сферу 
vec4 terrainHeightNormal(vec3 p, float dist, out vec2 uv) {
  //vec3 r = p - uPlanetCenter;
  vec4 h_d = height_d(p, dist, uv);
  return h_d;
}

// Единичный вектор направленный в зенит
vec3 terrainZenith(vec3 p) {
  return normalize(p - uPlanetCenter);
}

// Вектор относительно центра планеты
vec3 terrainFromCenter(vec3 p) {
  return p - uPlanetCenter;
}

// Вычисление нормали под точкой
vec3 terrainNormal(vec3 pos, float dist) {
  vec2 eps = vec2(0.01, 0.);
  return normalize(vec3(
    terrainHeight(pos - eps.xyy, dist) - terrainHeight(pos + eps.xyy, dist),
    //terrainHeight(pos - eps.yxy, dist) - terrainHeight(pos + eps.yxy, dist),
    2.*eps.x,
    terrainHeight(pos - eps.yyx, dist) - terrainHeight(pos + eps.yyx, dist)
  ));
}
