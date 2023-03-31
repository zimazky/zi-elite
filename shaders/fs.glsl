#version 300 es

//precision mediump float;
precision lowp float;

// разрешение экрана
uniform vec2 uResolution;

// параметры времени
// x - время с момента запуска программы в секундах, 
// y - время с момента отображения предыдущего кадра
uniform vec2 uTime;

// текстуры
uniform sampler2D uTextureGrayNoise;
uniform sampler2D uTextureBlueNoise;

// положение камеры
uniform vec4 uCameraPosition;
// скорость камеры
uniform vec3 uCameraVelocity;
// скорость вращения камеры
uniform vec3 uCameraRotationSpeed;
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

// насколько камера попадает под солнце:
// 1. - полностью на солнце, 0. - полностью в тени
uniform float uCameraInShadow; 

// синус половины углового размера солнца
uniform float uSunDiscAngleSin;
// направление на солнце
uniform vec3 uSunDirection;
// цвет и интенсивность света от солнца
uniform vec3 uSunDiscColor;
// цвет и интенсивность света неба
uniform vec3 uSkyColor;

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
in vec3 vRaySky; // Луч в системе координат небесного свода

out vec4 fragColor;

// ----------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------
const float PI = 3.14159265358979323846;
const mat3  IDENTITY = mat3(vec3(1,0,0),vec3(0,1,0),vec3(0,0,1));

const float MAX_TERRAIN_DISTANCE = 30000.;

// View modes
const float FRONT_VIEW = 0.;
const float MAP_VIEW = 1.;
const float DEPTH_VIEW = 2.;
// Map modes
const int MAP_ONLY = 0;
const int MAP_GRID = 1;
const int MAP_HEIGHTS = 2;

// ----------------------------------------------------------------------------
// Модуль определения общих функций
// ----------------------------------------------------------------------------
#ifndef COMM_MODULE
#include "common.glsl"
#endif

// ----------------------------------------------------------------------------
// Модуль определения функций расчета атмосферного рассеивания
// ----------------------------------------------------------------------------
#ifndef ATM_MODULE
#include "atmosphere.glsl"
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
// Модуль определения функции отображения ночного неба
// ----------------------------------------------------------------------------
#ifndef SKY_MODULE
#include "sky.glsl"
#endif

// ----------------------------------------------------------------------------
// Рендеринг
// ----------------------------------------------------------------------------

float raycast(vec3 ro, vec3 rd, float tmin, float tmax) {
  float t = tmin;
  for(int i=0; i<300; i++) {
    vec3 pos = ro + t*rd;
    if(pos.y>ro.y && pos.y>MAX_TRN_ELEVATION) return tmax + 1.;
    float h = pos.y - terrainM(pos.xz);
    if( abs(h)<(0.003*t) || t>tmax ) break; // двоятся детали при большем значении
    t += 0.4*h; // на тонких краях могут быть артефакты при большом коэффициенте
  }
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

const vec3 LIGHT_INTENSITY = vec3(15.); // Интенсивность света
vec4 render(vec3 ro, vec3 rd)
{
  float LvsR = step(0.5, gl_FragCoord.x/uResolution.x);
  vec3 light1 = uSunDirection;
  // косинус угла между лучем и солнцем 
  float sundot = clamp(dot(rd,light1),0.,1.);
  vec3 col;
  float t = raycast(ro, rd, 1., MAX_TERRAIN_DISTANCE);
  if(t>MAX_TERRAIN_DISTANCE) {
    // небо
    float sunsin = sqrt(1.-sundot*sundot);
    col = 0.5*nightSky(normalize(vRaySky));
    col += sunsin < uSunDiscAngleSin ? vec3(1.,0.8,0.6) : vec3(0);
    col *= planetIntersection(ro,rd);
    ResultScattering rs;
    //if(LvsR==0.) rs = scatteringOld(ro, rd, light1);
    //else rs = scattering(ro, rd, light1);
    rs = scattering(ro, rd, light1);
    col = rs.t*LIGHT_INTENSITY + rs.i*col;
    t = -1.0;
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
    if(LdotN>-xmin && shd>0.001) shd *= softShadow(pos, light1, t);
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

    ResultScattering rs = scatteringWithIntersection(ro,rd,light1,t);
    col = rs.t*LIGHT_INTENSITY + rs.i*col;

	}
  // sun scatter
  col += 0.2*uCameraInShadow*normalize(uSunDiscColor)*pow(sundot, 8.0);

  // 1-ая световая ракета
  vec3 fd = uFlare1Position - ro;
  float fdist2 = dot(fd,fd);
  float fdist = sqrt(fdist2);
  fd /= fdist;
  float f = step(0.999999, dot(fd,rd));
  col = (fdist-t)*sign(t)<0. ? mix(col,uFlare1Light,f) : col;
  // 2-ая световая ракета
   fd = uFlare2Position - ro;
  fdist2 = dot(fd,fd);
  fdist = sqrt(fdist2);
  fd /= fdist;
  f = step(0.999999, dot(fd,rd));
  col = (fdist-t)*sign(t)<0. ? mix(col,uFlare2Light,f) : col;

  return vec4(col, t);
}

void main(void) {
  vec2 uv = (gl_FragCoord.xy - 0.5*uResolution.xy)/uResolution.y;

  // значение на предыдущем кадре
  //vec4 data = texture(iChannel2, uv2);
  //float zbuf = data.w;

  
  vec3 pos = uCameraPosition.xyz;
  vec3 rd = normalize(vRay);

  vec4 col = vec4(0.);
  if(uScreenMode.x==MAP_VIEW) col = showMap(pos, uCameraDirection.xz, uv, int(uScreenMode.y));
  else { 
    col = render(pos, rd);
  }
  //if(uScreenMode.x == DEPTH_VIEW) fragColor = vec4(1.-vec3(pow(col.w/500.,0.1)), col.w);
  //else 

  col.rgb =  col.rgb*mat2sRGB; // Преобразование в sRGB
  //col.rgb = TonemapACES(col.rgb);
  // Квантование и дитеринг с гамма-коррекцией
  vec3 color = quantize_and_dither(col.rgb, 1./255., gl_FragCoord.xy);
  //vec3 color = oetf(col.rgb);
  fragColor = vec4( color, 1. );
  //col.rgb += noise(uv*uTime.x) / 127.; // dither
  //col.rgb = pow(col.rgb, vec3(1./2.2)); // gamma
  //fragColor = vec4( col.rgb, 1. );
}
 