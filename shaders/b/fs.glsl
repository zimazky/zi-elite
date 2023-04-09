#version 300 es

precision mediump float;

// разрешение экрана
uniform vec2 uResolution;

// текстуры
uniform sampler2D uTextureProgramA;
uniform vec2 uTextureAResolution;

// положение камеры
uniform vec3 uCameraPosition;
// вектор направления камеры
uniform vec3 uCameraDirection;

// цвет и интенсивность света фар: vec3(0.) - выключен
uniform vec3 uHeadLight;

// положение 1-ой сигнальной ракеты
uniform vec3 uFlare1Position;
// цвет и интенсивность света 1-ой сигнальной ракеты
uniform vec3 uFlare1Light;
// положение 2-ой сигнальной ракеты
uniform vec3 uFlare2Position;
// цвет и интенсивность света 2-ой сигнальной ракеты
uniform vec3 uFlare2Light;

// синус половины углового размера солнца
uniform float uSunDiscAngleSin;
// направление на солнце
uniform vec3 uSunDirection;
// цвет и интенсивность света от солнца
uniform vec3 uSunDiscColor;
// цвет и интенсивность света неба
uniform vec3 uSkyColor;
// Радиус планеты
uniform float uPlanetRadius;
// Положение центра планеты
uniform vec3 uPlanetCenter;


// x - режим экрана: 
//   FRONT_VIEW - вид камеры,
//   MAP_VIEW - вид карты,
//   DEPTH_VIEW - вид карты глубины (режим отключен)
// y - опции отображения карты: 
//   MAP_ONLY - только карта,
//   MAP_GRID - показывать сетку,
//   MAP_HEIGHTS - показывать изолинии высот
uniform vec2 uScreenMode;
// масштаб карты
uniform float uMapScale;

in vec3 vRay;    // Луч в системе координат планеты

out vec4 fragColor;

// ----------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------

// View modes
const float FRONT_VIEW = 0.;
const float MAP_VIEW = 1.;
const float DEPTH_VIEW = 2.;
// Map modes
const int MAP_ONLY = 0;
const int MAP_GRID = 1;
const int MAP_HEIGHTS = 2;

// ----------------------------------------------------------------------------
// Модуль определения констант
// ----------------------------------------------------------------------------
#ifndef CONST_MODULE
#include "constants.glsl"
#endif

// ----------------------------------------------------------------------------
// Модуль определения функций генерации ландшафта
// ----------------------------------------------------------------------------
#ifndef TERR_MODULE
#include "terrain.glsl"
#endif

// ----------------------------------------------------------------------------
// Модуль определения функций отображения карты
// ----------------------------------------------------------------------------
#ifndef MAP_MODULE
#include "map.glsl"
#endif

// ----------------------------------------------------------------------------
// Рендеринг
// ----------------------------------------------------------------------------


/** 
  * Функция определения мягкой тени от сферической поверхности планеты
  *   ro - положение точки, для которой производится рассчет
  *   rd - направление луча на солнце
  * Возвращает значения от 0. до 1.
  *   0. - если солнце полностью скрыто планетой
  *   1. - если солнце полностью видно
  */
float softPlanetShadow(vec3 ro, vec3 rd) {
  vec3 pos = ro - uPlanetCenter;
  //vec3 pos = vec3(0, ro.y+uPlanetRadius, 0);

  float OT = dot(pos, rd); // расстояния вдоль луча до точки минимального расстояния до центра планеты
  float CT = sqrt(dot(pos, pos) - OT*OT); // минимальное расстоянии от луча до центра планеты
  if(OT>0.) return 1.;
  float d = (uPlanetRadius-CT)/OT;
  return smoothstep(-uSunDiscAngleSin, uSunDiscAngleSin, d);
}


/** Рейтрейсинг для случая плоской поверхности планеты */
float raycast(vec3 ro, vec3 rd, float tmin, float tmax, out int i) {
  float t = tmin;
  float d = ro.y - MAX_TRN_ELEVATION;
  if(d >= 0.) t = clamp(-d/rd.y, t, tmax); // поиск стартовой точки, если камера выше поверхности максимальной высоты гор

  for(i=0; i<300; i++) {
    vec3 pos = ro + t*rd;
    if(pos.y>ro.y && pos.y>MAX_TRN_ELEVATION) return tmax + 1.;
    float h = pos.y - terrainM(pos.xz);
    if( abs(h)<(0.003*t) || t>tmax ) break; // двоятся детали при большем значении
    t += 0.4*h; // на тонких краях могут быть артефакты при большом коэффициенте
  }
  return t;
}

/** Рейтрейсинг для случая сферической поверхности планеты */
float raycastSpheric(vec3 ro, vec3 rd, float tmin, float tmax) {
  float t = tmin;
  /*
  НЕОБХОДИМО ПЕРЕРАБОТАТЬ
  float d = ro.y - MAX_TRN_ELEVATION;
  if(d >= 0.) t = clamp(-d/rd.y, 0., tmax); // поиск стартовой точки, если камера выше поверхности максимальной высоты гор

  for(int i=0; i<300; i++) {
    vec3 pos = ro + t*rd;
    if(pos.y>ro.y && pos.y>MAX_TRN_ELEVATION) return tmax + 1.;
    float h = pos.y - terrainM(pos.xz);
    if( abs(h)<(0.003*t) || t>tmax ) break; // двоятся детали при большем значении
    t += 0.4*h; // на тонких краях могут быть артефакты при большом коэффициенте
  }
  */
  return t;
}

vec3 lambert(vec3 omega, float mu, float mu_0) {
	return omega;
}

vec3  lommel_seeliger(vec3 omega, float mu, float mu_0) {
 	return omega / max( 0.01, mu + mu_0 );
}

// omega - альбедо
// omega_0 - альбедо одиночного рассеивания
// mu - косинус угла между нормалью и направлением на камеру
// mu0 - косинус угла между нормалью и направлением на источник света
vec3 lunar_lambert(vec3 omega, float mu, float mu_0) {
	// non-lambertian diffuse shading used for terrain land masses
	// mix Lambert and Lommel-Seeliger based on single scattering albedo omega_0,

	//return omega / max( 0.0001, mu + mu_0 );
	// return omega;

	/*
	vec3 omega_0 = 4. * omega / ( 3. * omega + 1. );
	return omega_0 * ( omega + .25 * ( 1. - omega ) / max( 0.0001, mu + mu_0 ) );
	*/
	vec3 omega_0 = 244. * omega/(184.*omega + 61.);
	return omega_0 * ( 0.5*omega*(1.+sqrt(mu*mu_0)) + .25/max(0.4, mu+mu_0) );
}

vec4 render(vec3 ro, vec3 rd, float t0)
{
  float LvsR = step(0.5, gl_FragCoord.x/uResolution.x);
  vec3 light1 = uSunDirection;
  // косинус угла между лучем и солнцем 
  float sundot = clamp(dot(rd,light1),0.,1.);
  vec3 col = vec3(0);
  int raycastIterations = 0;
  int shadowIterations = 0;
  float t = t0>MAX_TERRAIN_DISTANCE ? 2.*MAX_TERRAIN_DISTANCE : raycast(ro, rd, t0, MAX_TERRAIN_DISTANCE, raycastIterations);
  if(t>MAX_TERRAIN_DISTANCE) {
    t = 2. * MAX_TERRAIN_DISTANCE;

  #ifdef RAYCAST_ITERATIONS_VIEW
    t = 0.;
  #endif
  
  }
  else {
    // mountains		
    vec3 pos = ro + t*rd;
    vec3 nor = calcNormalH(pos, max(200.,t));
    vec3 hal = normalize(light1-rd);
        
    // цвет
    vec3 kd = terrain_color(pos, nor).rgb;

    // lighting		
    
    // ambient
    float amb = clamp(0.5+0.5*nor.y, 0., 1.);
	  float LdotN = dot(light1, nor);
    float RdotN = clamp(-dot(rd, nor), 0., 1.);

    // 1-ая световая ракета
    vec3 fd1 = uFlare1Position-pos;
    float fdist1sqr = dot(fd1,fd1);
    fd1 /= sqrt(fdist1sqr);
    float F1dotN = clamp(dot(fd1, nor), 0., 1.);
    // 2-ая световая ракета
    vec3 fd2 = uFlare2Position-pos;
    float fdist2sqr = dot(fd2,fd2);
    fd2 /= sqrt(fdist2sqr);
    float F2dotN = clamp(dot(fd2, nor), 0., 1.);

    float xmin = 6.*uSunDiscAngleSin; // синус половины углового размера солнца (здесь увеличен в 6 раз для мягкости), задает границу плавного перехода
    float shd = softPlanetShadow(pos, light1);
    if(LdotN>-xmin && shd>0.001) shd *= softShadow(pos, light1, t, shadowIterations);
    float dx = clamp(0.5*(xmin-LdotN)/xmin, 0., 1.);
    LdotN = clamp(xmin*dx*dx + LdotN, 0., 1.);

	  //vec3 lamb = 2.*AMBIENT_LIGHT*amb*lambert(kd, RdotN, amb) + SUN_LIGHT*LdotN*shd*lambert(kd, RdotN, LdotN);
	  //vec3 lomm = 2.*AMBIENT_LIGHT*amb*lommel_seeliger(kd, RdotN, amb) + SUN_LIGHT*LdotN*shd*lommel_seeliger(kd, RdotN, LdotN);
	  vec3 lunar = uSkyColor*amb*lunar_lambert(kd, RdotN, amb)     // свет от неба
      + uSunDiscColor*LdotN*shd*lunar_lambert(kd, RdotN, LdotN)  // свет солнца
      + uHeadLight*RdotN*lunar_lambert(kd, RdotN, RdotN)/(t*t)   // свет фар
      + uFlare1Light*F1dotN*lunar_lambert(kd, RdotN, F1dotN)/(fdist1sqr)  // свет 1-ой сигнальной ракеты
      + uFlare2Light*F2dotN*lunar_lambert(kd, RdotN, F2dotN)/(fdist2sqr);  // свет 2-ой сигнальной ракеты
    col = lunar;//mix(lomm, lunar, LvsR);
    
    //////////////////
	  // fog
    //float fo = 1.0-exp(-pow(0.00009*t,1.5) );
    //col = mix(col, FOG_COLOR, fo );
	}

  // 1-ая световая ракета
  vec3 fd = uFlare1Position - ro;
  float fdist2 = dot(fd, fd);
  float fdist = sqrt(fdist2);
  fd /= fdist;
  float f = dot(fd, rd);
  if(f>=0.999999 && fdist<t) {
    col = uFlare1Light;
    t = fdist;
  }
  // 2-ая световая ракета
  fd = uFlare2Position - ro;
  fdist2 = dot(fd, fd);
  fdist = sqrt(fdist2);
  fd /= fdist;
  f = dot(fd, rd);
  if(f>=0.999999 && fdist<t) {
    col = uFlare2Light;
    t = fdist;
  }

#ifdef RAYCAST_ITERATIONS_VIEW
  col = vec3(raycastIterations)/300.;
#endif

#ifdef SHADOWS_ITERATIONS_VIEW
  col = vec3(shadowIterations)/200.;
#endif

  return vec4(col, t);
}

void main(void) {
  vec2 uv = (gl_FragCoord.xy - 0.5*uResolution.xy)/uResolution.y;
  float LvsR = step(0.5, gl_FragCoord.x/uResolution.x);

  vec3 pos = uCameraPosition;
  vec3 rd = normalize(vRay);

  vec2 ts = gl_FragCoord.xy/uResolution;
  vec4 bufA = texture(uTextureProgramA, ts);

  vec4 col = vec4(0.);
  if(uScreenMode.x==MAP_VIEW) col = showMap(pos, uCameraDirection.xz, uv, int(uScreenMode.y));
  else {

#ifdef DEPTH_ERROR_VIEW
    col = render(pos, rd, 1.);
#else
    col = render(pos, rd, bufA.w);
#endif

  }

  fragColor = col;
}
 