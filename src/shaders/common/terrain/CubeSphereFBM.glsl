#define TERR_MODULE
// ----------------------------------------------------------------------------
// Генерация ландшафта - FBM на кубосфере
// ----------------------------------------------------------------------------


// Радиус планеты
uniform float uPlanetRadius;
// Положение центра планеты
uniform vec3 uPlanetCenter;

const float W_SCALE = 2000.; // масштаб по горизонтали
const float H_SCALE = 1100.; // масштаб по высоте
const float MAX_TRN_ELEVATION = 1.9*H_SCALE; // максимальная высота

// ----------------------------------------------------------------------------
// Модуль расчета фрактального шума
// ----------------------------------------------------------------------------
#ifndef FBMNOISE_MODULE
//include "src/shaders/common/Noise/FbmRidged2.glsl";
#include "src/shaders/common/Noise/FbmInigoQuilez.glsl";
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

float terrainAlt(vec3 p) {
  vec3 r = p - uPlanetCenter;
  return length(r) - uPlanetRadius;
}

const float nScale = W_SCALE/H_SCALE;
const float oneOverWScale = 1./W_SCALE;

// Высота и нормаль на кубосфере в зависимости от декартовых координат точки проецируемой отвесно на сферу 
// p - координаты точки
// dist - дистанция от камеры до точки
// uv - выходное значение текстурных кординат
// возвращает:
// xyz - нормаль
// w - высота
// uv - текстурные координаты на кубе отмасштабированные по ширине (1. соответствует дитанции W_SCALE)
vec4 terrainHeightNormal(vec3 p, float dist, out vec2 uvCoord) {
  // Размер куба на который проецируется вектор для позиционирования на кубосфере
  float cubeRad = uPlanetRadius*ONE_OVER_SQRT3;
  vec3 r = p - uPlanetCenter;
  vec3 absR = abs(r);
  vec4 h_d;
  
  //float LvsR = step(0.5, gl_FragCoord.x/uResolution.x);

  if(absR.x > absR.y) {
    if(absR.x > absR.z) {
      vec2 uv = r.yz/absR.x;
      uvCoord = uv*oneOverWScale*cubeRad;
      h_d = terrainFbm(uvCoord, dist);
      h_d.z *= nScale;
      // Матрица преобразования нормалей из касательного пространства относительно сферы к объектному пространству
      //  [    d    0  u/d ]
      //  [    0    d  v/d ]
      //  [ -d*u -d*v  1/d ]
      //
      // d = sqrt(u*u + v*v + 1)
      // u,v - координаты на плоскостях куба в диапазоне (-1..1)
      // u = sqrt(3)*x/R
      // v = sqrt(3)*y/R
      float d = sqrt(dot(uv,uv)+1.);
      vec3 uvdivd = vec3(uv,1)/d;
      vec2 uvmuld = -d*uv;
      mat3 m = mat3(d, 0, uvmuld.x, 0, d, uvmuld.y, uvdivd);
      h_d.xyz = m * h_d.xyz;
      h_d.xyz = h_d.zxy; // x+
      h_d.x *= sign(r.x); // x-
    }
    else {
      vec2 uv = r.xy/absR.z;
      uvCoord = uv*oneOverWScale*cubeRad;
      h_d = terrainFbm(uvCoord, dist);
      h_d.z *= nScale;
      float d = sqrt(dot(uv,uv)+1.);
      vec3 uvdivd = vec3(uv,1)/d;
      vec2 uvmuld = -d*uv;
      mat3 m = mat3(d, 0, uvmuld.x, 0, d, uvmuld.y, uvdivd);
      h_d.xyz = m * h_d.xyz;
      //h_d.xyz = h_d.xyz; // z+
      h_d.z *= sign(r.z); // z-
    }
  }
  else {
    if(absR.y > absR.z) {
      vec2 uv = r.xz/absR.y;
      uvCoord = uv*oneOverWScale*cubeRad;
      h_d = terrainFbm(uvCoord, dist);
      h_d.z *= nScale;
      float d = sqrt(dot(uv,uv)+1.);
      vec3 uvdivd = vec3(uv,1)/d;
      vec2 uvmuld = -d*uv;
      mat3 m = mat3(d, 0, uvmuld.x, 0, d, uvmuld.y, uvdivd);
      h_d.xyz = m * h_d.xyz;
      h_d.xyz = h_d.xzy; // y+
      h_d.y *= sign(r.y); // y-
    }
    else {
      vec2 uv = r.xy/absR.z;
      uvCoord = uv*oneOverWScale*cubeRad;
      h_d = terrainFbm(uvCoord, dist);
      h_d.z *= nScale;
      float d = sqrt(dot(uv,uv)+1.);
      vec3 uvdivd = vec3(uv,1)/d;
      vec2 uvmuld = -d*uv;
      mat3 m = mat3(d, 0, uvmuld.x, 0, d, uvmuld.y, uvdivd);
      h_d.xyz = m * h_d.xyz;
      //h_d.xyz = h_d.xyz; // z+
      h_d.z *= sign(r.z); // z-
    }
  }
  return vec4(normalize(h_d.xyz), H_SCALE*h_d.w);
}

// Высота на кубосфере в зависимости от декартовых координат точки проецируемой отвесно на сферу 
float terrainHeight(vec3 p) {
  // Размер куба на который проецируется вектор для позиционирования на кубосфере
  float cubeRad = uPlanetRadius*ONE_OVER_SQRT3;
  vec3 r = p - uPlanetCenter;
  vec3 absR = abs(r);
  float h;
  if(absR.x > absR.y) {
    if(absR.x > absR.z) {
      vec3 s = r*cubeRad/absR.x;
      h = terrainFbmLight(s.yz*oneOverWScale);
    }
    else {
      vec3 s = r*cubeRad/absR.z;
      h = terrainFbmLight(s.xy*oneOverWScale);
    }
  }
  else {
    if(absR.y > absR.z) {
      vec3 s = r*cubeRad/absR.y;
      h = terrainFbmLight(s.xz*oneOverWScale);
    }
    else {
      vec3 s = r*cubeRad/absR.z;
      h = terrainFbmLight(s.xy*oneOverWScale);
    }
  }
  return H_SCALE*h;
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
    terrainHeight(pos - eps.xyy) - terrainHeight(pos + eps.xyy),
    //terrainHeight(pos - eps.yxy, dist) - terrainHeight(pos + eps.yxy, dist),
    2.*eps.x,
    terrainHeight(pos - eps.yyx) - terrainHeight(pos + eps.yyx)
  ));
}
