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

// ----------------------------------------------------------------------------
// Генерация ландшафта
// ----------------------------------------------------------------------------
uniform sampler2D uTextureGrayNoise;

// value noise, and its analytical derivatives
vec3 noised(vec2 x) {
  vec2 f = fract(x);
  vec2 u = f*f*(3.0-2.0*f);
  vec2 du = 6.0*f*(1.0-f);

  vec2 p = floor(x);
  float a = textureLod(uTextureGrayNoise, (p+vec2(0.5,0.5))/256.0, 0.0 ).x * 2. - 1.;
  float b = textureLod(uTextureGrayNoise, (p+vec2(1.5,0.5))/256.0, 0.0 ).x * 2. - 1.;
  float c = textureLod(uTextureGrayNoise, (p+vec2(0.5,1.5))/256.0, 0.0 ).x * 2. - 1.;
  float d = textureLod(uTextureGrayNoise, (p+vec2(1.5,1.5))/256.0, 0.0 ).x * 2. - 1.;

  return vec3((a+(b-a)*u.x+(c-a)*u.y+(a-b-c+d)*u.x*u.y),
               du*(u.yx*(a-b-c+d) + vec2(b,c) - a));
}

// расчет гладкого шума с первой и второй производной
// dx.w - производная по x
// dx.xy - вторые производные по x и y
// dy.w - производная по y
// dy.xy - вторые производные по x и y
// возвращает 
// w - значение шума
// xy - первые производные
vec4 noised2(vec2 x, out vec4 dx, out vec4 dy) {
  vec2 f = fract(x);
  vec2 u = f*f*(3.0-2.0*f);
  vec2 du = 6.0*f*(1.0-f);

  vec2 p = floor(x);
  float a = textureLod(uTextureGrayNoise, (p+vec2(0.5,0.5))/256.0, 0.0 ).x * 2. - 1.;
  float b = textureLod(uTextureGrayNoise, (p+vec2(1.5,0.5))/256.0, 0.0 ).x * 2. - 1.;
  float c = textureLod(uTextureGrayNoise, (p+vec2(0.5,1.5))/256.0, 0.0 ).x * 2. - 1.;
  float d = textureLod(uTextureGrayNoise, (p+vec2(1.5,1.5))/256.0, 0.0 ).x * 2. - 1.;

  float abcd = a-b-c+d;
  vec2 d2u = u.yx*abcd + vec2(b,c) - a;
  vec2 d2 = d2u * 6.0*(1.0-2.0*f);  // вторые производные d2/(dx dx) d2/(dy dy)
  float dxy = abcd*du.x*du.y;  // вторые производные d2/(dx dy) = d2/(dy dx)
  vec2 d1 = du*d2u; 

  dx = vec4(d2.x, dxy, 0., d1.x);
  dy = vec4(dxy, d2.y, 0., d1.y);
  return vec4(d1, 0, (a+(b-a)*u.x+(c-a)*u.y+abcd*u.x*u.y));
}


const mat2 im2 = mat2(0.8,-0.6,0.6,0.8);

// Генерация высоты с эррозией c производными (эталон)
// возвращает
// w - значение
// xyz - частные производные
vec4 fbmInigoQuilezOrig(vec2 p) {
  float a = 0.0;
  float b = 1.0;
  float f = 1.0;
  vec2 d = vec2(0);
  for( int i=0; i<11; i++ ) {
    vec3 n = noised(f*p);
    d += b*n.yz*f;                // accumulate derivatives (note that in this case b*f=1.0)
    a += b*n.x;///(1.+dot(d,d));  // accumulate values
    b *= 0.5;                     // amplitude decrease
    f *= 2.0;                     // frequency increase
  }
  return vec4(-d.x, -d.y, 1, a);
}

// Генерация высоты с эррозией c производными и вычислением нормали (тест2)
// возвращает
// w - значение
// xyz - частные производные
vec4 fbmInigoQuilez(vec2 p) {
  float a = 0.0;
  float b = 1.0;
  float fr = 1.0;
  vec2 d = vec2(0);//ZERO_D;
  vec4 g = ZERO_D, h = ZERO_D;
  for( int i=0; i<11; i++ ) {
    vec4 tdx, tdy;
    vec4 f = noised2(fr*p, tdx, tdy);
    // определение деноминатора, определяющего эрозию
    g += tdx;
    h += tdy;
    float den = 1. + square(g.w) + square(h.w);
    float den2 = den*den;
    // накопление значения высоты
    a += b*f.w/den;
    // накопление величин производных с учетом эрозии (в последнем члене вторые производные)
    // b*fr = 1.0 поэтому производные не масштабируются
    d += f.xy/den - 2.*f.w*(g.w*g.xy+h.w*h.xy)/den2;
    b *= 0.5;                     // уменьшение амплитуды следующей октавы
    fr *= 2.0;                    // увеличение частоты следующей октавы
  }
  return vec4(-d.x, -d.y, 2, a);
}

const float nScale = H_SCALE/W_SCALE;
vec4 height_d(vec3 r) {
  // Размер куба на который проецируется вектор для позиционирования на кубосфере 
  float cubeRad = uPlanetRadius*ONE_OVER_SQRT3;
  vec3 absR = abs(r);
  vec4 h_d;
  if(absR.x > absR.y) {
    if(absR.x > absR.z) {
      vec3 s = r - r*(r.x-cubeRad)/r.x;
      h_d = fbmInigoQuilez(s.yz/W_SCALE);
      h_d.xyz = vec3(h_d.z, nScale*h_d.xy); // x+
      if(r.x < 0.) h_d.x = -h_d.x; // x-
    }
    else {
      vec3 s = r - r*(r.z-cubeRad)/r.z;
      h_d = fbmInigoQuilez(s.xy/W_SCALE);
      h_d.xyz = vec3(nScale*h_d.xy, h_d.z); // z+
      if(r.z < 0.) h_d.z = -h_d.z; // z-
    }
  }
  else {
    if(absR.y > absR.z) {
      vec3 s = r - r*(r.y-cubeRad)/r.y;
      h_d = fbmInigoQuilez(s.xz/W_SCALE);
      h_d.xyz = vec3(nScale*h_d.x, h_d.z, nScale*h_d.y); // y+
      if(r.y < 0.) h_d.y = -h_d.y; // y-
    }
    else {
      vec3 s = r - r*(r.z-cubeRad)/r.z;
      h_d = fbmInigoQuilez(s.xy/W_SCALE);
      h_d.xyz = vec3(nScale*h_d.xy, h_d.z); // z+
      if(r.z < 0.) h_d.z = -h_d.z; // z-
    }
  }
  return vec4(normalize(h_d.xyz), H_SCALE*h_d.w);
}

// Высота на кубосфере в зависимости от декартовых координат точки проецируемой отвесно на сферу 
float terrainHeight(vec3 p) {
  vec3 r = p - uPlanetCenter;
  vec4 h_d = height_d(r);
  return h_d.w;
}

// Высота и нормаль на кубосфере в зависимости от декартовых координат точки проецируемой отвесно на сферу 
vec4 terrainHeightNormal(vec3 p) {
  vec3 r = p - uPlanetCenter;
  vec4 h_d = height_d(r);
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
vec3 terrainNormal(vec3 pos) {
  vec2 eps = vec2(0.1, 0.);
  return normalize(vec3(
    terrainHeight(pos - eps.xyy) - terrainHeight(pos + eps.xyy),
    //terrainHeight(pos - eps.yxy) - terrainHeight(pos + eps.yxy),
    2.*eps.x,
    terrainHeight(pos - eps.yyx) - terrainHeight(pos + eps.yyx)
  ));
}

vec4 terrainColor(vec3 lla, vec3 nor) {
  //return biomeColor(lla, nor);
  return vec4(0.6*pow(vec3(0.5, 0.5, 0.5), vec3(2.2)), 1.);

  //return vec4(0.6*pow(vec3(0.5725, 0.4667, 0.4392), vec3(2.2)), 1.);
}