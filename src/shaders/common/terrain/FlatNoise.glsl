#define TERR_MODULE
// ----------------------------------------------------------------------------
// Генерация ландшафта - пирамиды на плоскости XZ
// ----------------------------------------------------------------------------

#define TERR_FLAT // Определение ландшафта на плоскости

// Радиус планеты
uniform float uPlanetRadius;
// Положение центра планеты
uniform vec3 uPlanetCenter;

const float W_SCALE = 3000.; // масштаб по горизонтали
const float H_SCALE = 1100.; // масштаб по высоте
//const float MAX_TRN_ELEVATION = 1.8*H_SCALE; // максимальная высота

// Перевод декартовых координат точки в псевдосферические координаты для плоской поверхности
// Начало декартовых координат совпадает с точкой 0,0,0
// Возвращается:
// x - долгота (координата x)
// y - широта (координата z)
// z - высота над поверхностью (координата y)
vec3 lonLatAlt(vec3 p) {
  return p.xzy;
}

// Единичный вектор направленный в зенит
vec3 terrainZenith(vec3 p) {
  return vec3(0, 1, 0);
}

// Вектор относительно центра планеты
vec3 terrainFromCenter(vec3 p) {
  return vec3(0, p.y, 0) - uPlanetCenter;
}


vec4 terrainColor(vec3 pos, vec3 nor) {
  return vec4(0.6*pow(vec3(0.5725, 0.4667, 0.4392), vec3(2.2)), 1.);
}


// ----------------------------------------------------------------------------
// Генерация ландшафта
// ----------------------------------------------------------------------------
uniform sampler2D uTextureGrayNoise;

// value noise, and its analytical derivatives
vec3 noised(vec2 x) {
  vec2 f = fract(x);
  //vec2 u = f*f*f*(f*(f*6.0-15.0)+10.0);
  //vec2 du = 30.0*f*f*(f*(f-2.0)+1.0);
    vec2 u = f*f*(3.0-2.0*f);
    vec2 du = 6.0*f*(1.0-f);

  vec2 p = floor(x);
  float a = textureLod(uTextureGrayNoise, (p+vec2(0.5,0.5))/256.0, 0.0 ).x;
  float b = textureLod(uTextureGrayNoise, (p+vec2(1.5,0.5))/256.0, 0.0 ).x;
  float c = textureLod(uTextureGrayNoise, (p+vec2(0.5,1.5))/256.0, 0.0 ).x;
  float d = textureLod(uTextureGrayNoise, (p+vec2(1.5,1.5))/256.0, 0.0 ).x;

  return vec3((a+(b-a)*u.x+(c-a)*u.y+(a-b-c+d)*u.x*u.y),
               du*(u.yx*(a-b-c+d) + vec2(b,c) - a));
}


const mat2 im2 = mat2(0.8,-0.6,0.6,0.8);
const float GRASS_HEIGHT_MAX = 600.;
const float SEA_LEVEL = 0.;


// Высота на кубосфере в зависимости от декартовых координат точки проецируемой отвесно на сферу 
//float terrainOnCubeSphere(vec3 r) {
//  return H_SCALE*pyramid(r*360./PI);
//}

// Генерация высоты с эррозией без производных упрощенная
float terrainHeight(vec3 pos) {
  vec2  x = pos.xz;
  vec2  p = x/W_SCALE;
  float a = 0.0;
  float b = 1.0;
  vec2  d = vec2(0.0);
  for( int i=0; i<9; i++ ) {
    vec3 n = noised(p);
    d += n.yz; a += b*n.x/(1.+dot(d,d));
    b *= 0.5; p = im2*p*2.0;
  }
  return max(H_SCALE*a,SEA_LEVEL);
}

/*
float terrainM(vec2 x) {
  vec2  p = x/W_SCALE;
  float a = 0.0;
  float b = 1.0;
  vec2  d = vec2(0.0);
  for( int i=0; i<9; i++ ) {
    vec3 n = noised(p);
    float flatland = 1.;//clamp((n.x*H_SCALE-300.)/(GRASS_HEIGHT_MAX-300.),0.,1.);
    flatland *= flatland;
    d += n.yz; a += flatland*b*n.x/(1.+dot(d,d));
    b *= 0.5; p = im2*p*2.0;
  }
  return max(H_SCALE*a,SEA_LEVEL);
}
float terrainS(vec2 x) {
  vec2  p = x/W_SCALE;
  float a = 0.0;
  float b = 1.0;
  vec2  d = vec2(0.0);
  for( int i=0; i<5; i++ ) {
    vec3 n = noised(p);
    float flatland = 1.;//clamp((n.x*H_SCALE-300.)/(GRASS_HEIGHT_MAX-300.),0.,1.);
    flatland *= flatland;
    d += n.yz; a += flatland*b*n.x/(1.+dot(d,d));
    b *= 0.5; p = im2*p*2.0;
  }
  return max(H_SCALE*a,SEA_LEVEL);
}
*/

/*
vec3 calcNormalH(vec3 pos, float t) {
  vec2 eps = vec2(0.001*t, 0.0);
  return normalize(vec3(
    terrainH(pos.xz-eps.xy) - terrainH(pos.xz+eps.xy),
    2.0*eps.x,
    terrainH(pos.xz-eps.yx) - terrainH(pos.xz+eps.yx)
  ));
}

vec3 calcNormalM(vec3 pos, float t) {
  vec2 eps = vec2(0.001*t, 0.0);
  return normalize(vec3(
    terrainM(pos.xz-eps.xy) - terrainM(pos.xz+eps.xy),
    2.0*eps.x,
    terrainM(pos.xz-eps.yx) - terrainM(pos.xz+eps.yx)
  ));
}
*/

// Вычисление нормали под точкой
vec3 terrainNormal(vec3 pos) {
  vec2 eps = vec2(0.1, 0.);
  return normalize(vec3(
    terrainHeight(pos - eps.xyy) - terrainHeight(pos + eps.xyy),
    2.*eps.x,
    terrainHeight(pos - eps.yyx) - terrainHeight(pos + eps.yyx)
  ));
}
