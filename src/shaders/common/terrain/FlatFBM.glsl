#define TERR_MODULE
// ----------------------------------------------------------------------------
// Генерация ландшафта - InigoQuilezFBM на плоскости XZ
// ----------------------------------------------------------------------------

#define TERR_FLAT // Определение ландшафта на плоскости



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
//include "src/shaders/common/Noise/FbmRidged2.glsl";
#include "src/shaders/common/Noise/FbmInigoQuilez.glsl";
#endif

// Перевод декартовых координат точки в псевдосферические координаты для плоской поверхности
// Начало декартовых координат совпадает с точкой 0,0,0
// Возвращается:
// x - долгота (координата x)
// y - широта (координата z)
// z - высота над поверхностью (координата y)
vec3 lonLatAlt(vec3 p) { return p.xzy; }

float terrainAlt(vec3 p) { return p.y; }

// Единичный вектор направленный в зенит
vec3 terrainZenith(vec3 p) { return vec3(0, 1, 0); }

// Вектор относительно центра планеты
vec3 terrainFromCenter(vec3 p) { return vec3(0, p.y + uPlanetRadius, 0); }

const float nScale = H_SCALE/W_SCALE;
// pos - координаты точки
// dist - дистанция от камеры до точки
// uv - выходное значение текстурных кординат
// возвращает:
// xyz - нормаль
// w - высота
vec4 height_d(vec3 pos, float dist, out vec2 uv) {
  uv = pos.xz;
  vec4 h_d = terrainFbm(uv/W_SCALE, dist);
  h_d.z /= nScale;
  return vec4(normalize(h_d.xzy), H_SCALE*h_d.w);
}

float terrainHeight(vec3 pos) {
  float h = terrainFbmLight(pos.xz/W_SCALE);
  return h*H_SCALE;
}

vec4 terrainHeightNormal(vec3 pos, float dist, out vec2 uv) {
  vec4 h_d = height_d(pos, dist, uv);
  return h_d;
}

// Вычисление нормали под точкой
vec3 terrainNormal(vec3 pos, float dist) {
  vec2 eps = vec2(0.01, 0.);
  return normalize(vec3(
    terrainHeight(pos - eps.xyy) - terrainHeight(pos + eps.xyy),
    2.*eps.x,
    terrainHeight(pos - eps.yyx) - terrainHeight(pos + eps.yyx)
  ));
}
