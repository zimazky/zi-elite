#define TERR_MODULE
// ----------------------------------------------------------------------------
// Генерация ландшафта - пирамиды на кубосфере
// ----------------------------------------------------------------------------

// Радиус планеты
uniform float uPlanetRadius;
// Положение центра планеты
uniform vec3 uPlanetCenter;

const float W_SCALE = 1000.; // масштаб по горизонтали
const float H_SCALE = 1100.; // масштаб по высоте
//const float MAX_TRN_ELEVATION = 1.8*H_SCALE; // максимальная высота

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

float pyramidOnCubeSphere(vec3 r) {
  // Размер куба на который проецируется вектор для позиционирования на кубосфере 
  float cubeRad = uPlanetRadius*ONE_OVER_SQRT3;
  vec3 absR = abs(r);
  vec2 f;
  if(absR.x > absR.y) {
    if(absR.x > absR.z) {
      vec3 s = r - r*(r.x-cubeRad)/r.x;
      f = s.yz;
      //if(r.x > 0.) f = vec2(s.y, s.z); // x+
      //else f = vec2(s.y, s.z); // x-
    }
    else {
      vec3 s = r - r*(r.z-cubeRad)/r.z;
      f = s.xy;
      //if(r.z > 0.) f = vec2(s.x, s.y); // z+
      //else f = vec2(s.x, s.y); // z-
    }
  }
  else {
    if(absR.y > absR.z) {
      vec3 s = r - r*(r.y-cubeRad)/r.y;
      f = s.xz;
      //if(r.y > 0.) f = vec2(s.x, s.z); // y+
      //else f = vec2(s.x, s.z); // y-
    }
    else {
      vec3 s = r - r*(r.z-cubeRad)/r.z;
      f = s.xy;
      //if(r.z > 0.) f = vec2(s.x, s.y); // z+
      //else f = vec2(s.x, s.y); // z-
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

// Единичный вектор направленный в зенит
vec3 terrainZenith(vec3 p) {
  return normalize(p - uPlanetCenter);
}

// Вектор относительно центра планеты
vec3 terrainFromCenter(vec3 p) {
  return p - uPlanetCenter;
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

vec4 terrainColor(vec3 pos, vec3 nor) {
  return vec4(0.6*pow(vec3(0.5, 0.5, 0.5), vec3(2.2)), 1.);

  //return vec4(0.6*pow(vec3(0.5725, 0.4667, 0.4392), vec3(2.2)), 1.);
}