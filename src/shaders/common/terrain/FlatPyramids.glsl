#define TERR_MODULE
// ----------------------------------------------------------------------------
// Генерация ландшафта - пирамиды на плоскости XZ
// ----------------------------------------------------------------------------

#define TERR_FLAT // Определение ландшафта на плоскости

// Радиус планеты
uniform float uPlanetRadius;
// Положение центра планеты
uniform vec3 uPlanetCenter;

// Перевод декартовых координат точки в псевдосферические координаты для плоской поверхности
// Начало декартовых координат совпадает с точкой 0,0,0
// Возвращается:
// x - долгота (координата x)
// y - широта (координата z)
// z - высота над поверхностью (координата y)
vec3 lonLatAlt(vec3 p) {
  return p.xzy;
}

float pyramid(vec2 x) {
  vec2 f = vec2(1) - abs(2.*fract(x)-vec2(1));
  return min(f.x,f.y);
}

const float W_SCALE = 1500.; // масштаб по горизонтали
const float H_SCALE = 1100.; // масштаб по высоте
//const float MAX_TRN_ELEVATION = 1.8*H_SCALE; // максимальная высота

// Высота поверхности 
float terrainHeight(vec3 p) {
  return H_SCALE*pyramid(p.xz/W_SCALE);
}

// Единичный вектор направленный в зенит
vec3 terrainZenith(vec3 p) {
  return vec3(0, 1, 0);
}

// Вектор относительно центра планеты
vec3 terrainFromCenter(vec3 p) {
  return vec3(0, p.y, 0) - uPlanetCenter;
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

vec4 terrainColor(vec3 pos, vec3 nor) {
  return vec4(0.6*pow(vec3(0.5725, 0.4667, 0.4392), vec3(2.2)), 1.);
}