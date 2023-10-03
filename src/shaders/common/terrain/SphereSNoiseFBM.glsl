#define TERR_MODULE
// ----------------------------------------------------------------------------
// Генерация ландшафта - пирамиды на кубосфере
// ----------------------------------------------------------------------------


// ----------------------------------------------------------------------------
// Модуль функций автоматического дифференцирования
// ----------------------------------------------------------------------------
#ifndef AUTODIFF_MODULE
#include "src/shaders/common/Autodiff/Autodiff.glsl";
#endif

// ----------------------------------------------------------------------------
// Модуль функций шума
// ----------------------------------------------------------------------------
#ifndef NOISE_MODULE
#include "src/shaders/common/Noise/SNoise.glsl";
#endif


// Радиус планеты
uniform float uPlanetRadius;
// Положение центра планеты
uniform vec3 uPlanetCenter;

const float W_SCALE = 3000.; // масштаб по горизонтали
const float H_SCALE = 1100.; // масштаб по высоте
const float MAX_TRN_ELEVATION = 1.9*H_SCALE; // максимальная высота

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

float fbmSnoise(vec3 r) {
  float a = 0.0;
  float b = 1.0;
  float f = 1.0;
  //vec2 d = vec2(0);
  for( int i=0; i<5; i++ ) {
    float h = snoise(f*r);
    //d += b*n.yz*f;                // accumulate derivatives (note that in this case b*f=1.0)
    a += b*h;///(1.+dot(d,d));  // accumulate values
    b *= 0.5;                     // amplitude decrease
    f *= 2.0;                     // frequency increase
  }
  return a;
}


// ----------------------------------------------------------------------------
// Генерация ландшафта
// ----------------------------------------------------------------------------

const float nScale = H_SCALE/W_SCALE;
// r - точка относительно центра планеты
// возвращает:
float height(vec3 r, float dist) {
  vec3 rNormalised = normalize(r)*2.;
  float h = fbmSnoise(rNormalised);
  return H_SCALE*h;
}

// p - координаты точки
// возвращает:
// xyz - нормаль
// w - высота
// uv - текстурные координаты на кубе
vec4 height_d(vec3 p, float dist, out vec2 uvCoord) {
  vec3 r = p - uPlanetCenter;
  vec3 lla = lonLatAlt(p);
  float h = height(r, dist);
  vec2 eps = vec2(10., 0.);
  vec3 nor = vec3(
    height(r - eps.xyy, dist) - height(r + eps.xyy, dist),
    height(r - eps.yxy, dist) - height(r + eps.yxy, dist),
    height(r - eps.yyx, dist) - height(r + eps.yyx, dist)
  );
  vec3 rN = normalize(r);
  float rNdotNor = dot(rN, nor);
  nor = nor - rNdotNor*rN + rN*2.*eps.x;
  return vec4(normalize(nor), h);
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
    //terrainHeight(pos - eps.yxy) - terrainHeight(pos + eps.yxy),
    2.*eps.x,
    terrainHeight(pos - eps.yyx, dist) - terrainHeight(pos + eps.yyx, dist)
  ));
}

vec4 terrainColor(vec3 lla, vec3 nor) {
  //return biomeColor(lla, nor);
  return vec4(0.6*pow(vec3(0.5, 0.5, 0.5), vec3(2.2)), 1.);

  //return vec4(0.6*pow(vec3(0.5725, 0.4667, 0.4392), vec3(2.2)), 1.);
}