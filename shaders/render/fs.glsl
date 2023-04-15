#version 300 es

precision mediump float;

// разрешение экрана
uniform vec2 uResolution;

// положение камеры
uniform vec3 uCameraPosition;
// насколько камера попадает под солнце:
// 1. - полностью на солнце, 0. - полностью в тени
uniform float uCameraInShadow;
// синус половины углового размера солнца
uniform float uSunDiscAngleSin;
// направление на солнце
uniform vec3 uSunDirection;
// цвет и интенсивность света от солнца
uniform vec3 uSunDiscColor;


// текстуры
uniform sampler2D uTextureProgramA;
uniform sampler2D uTextureProgramB;
uniform vec2 uTextureBResolution;
uniform sampler2D uTextureBlueNoise;

in vec3 vRay;
in vec3 vRaySky;

out vec4 fragColor;

// ----------------------------------------------------------------------------
// Модуль определения констант
// ----------------------------------------------------------------------------
#ifndef CONST_MODULE
#include "common/constants.glsl"
#endif

// ----------------------------------------------------------------------------
// Модуль определения функций расчета атмосферного рассеивания
// ----------------------------------------------------------------------------
#ifndef ATM_MODULE
#include "render/atmosphere.glsl"
#endif

// ----------------------------------------------------------------------------
// Модуль определения функции отображения ночного неба
// ----------------------------------------------------------------------------
#ifndef SKY_MODULE
#include "render/sky.glsl"
#endif


/**
 * Преобразование в линейное цветовое пространство из sRGB
 */
vec3 eotf(vec3 arg) {	return pow(arg, vec3(2.2)); }

/**
 * Преобразование в sRGB из линейного цветового пространства
 */
vec3 oetf(vec3 arg) {	return pow(arg, vec3(1./2.2)); }

// Матрица преобразования цветового пространства из базиса (615,535,445) в sRGB
mat3 mat2sRGB = mat3(
   1.6218, -0.4493,  0.0325,
  -0.0374,  1.0598, -0.0742,
  -0.0283, -0.1119,  1.0491
);

/**
 * Квантование цвета и дитеринг (добавление шума, чтобы не было резких переходов между квантами цвета)
 * quant = 1./255.
 */
vec3 quantize_and_dither(vec3 col, float quant, vec2 fcoord) {
	vec3 noise = .5/65536. +
    texelFetch( uTextureBlueNoise, ivec2( fcoord / 8. ) & ( 1024 - 1 ), 0 ).xyz * 255./65536. +
    texelFetch( uTextureBlueNoise, ivec2( fcoord )		 & ( 1024 - 1 ), 0 ).xyz * 255./256.;
	vec3 c0 = floor( oetf( col ) / quant ) * quant;
	vec3 c1 = c0 + quant;
	vec3 discr = mix( eotf( c0 ), eotf( c1 ), noise );
	return mix( c0, c1, lessThan( discr, col ) );
}

void main() {

  float k = uResolution.x/uResolution.y > uTextureBResolution.x/uTextureBResolution.y
    ? uTextureBResolution.x/uResolution.x
    : uTextureBResolution.y/uResolution.y;
  vec2 uv = vec2(0.5)+k/uTextureBResolution*(gl_FragCoord.xy-0.5*uResolution);

#ifdef DEPTH_ERROR_VIEW
  uv = gl_FragCoord.xy/uResolution;
  vec4 bufA = texture(uTextureProgramA, uv);
#endif

  vec4 bufB = texture(uTextureProgramB, uv);

#ifdef DEPTH_ERROR_VIEW
  float derr = bufB.w-bufA.w;
  vec3 col = derr<0. ? vec3(-derr,0,0) : vec3(derr/100.);
  col = pow(col, vec3(1./2.2));
#else

  vec3 col = bufB.rgb;
  float t = bufB.w;

  vec3 rd = normalize(vRay);
  // косинус угла между лучем и солнцем 
  float sundot = clamp(dot(rd, uSunDirection),0.,1.);

  if(t > MAX_TERRAIN_DISTANCE) {
    // небо из текстуры
    col = 0.5*nightSky(normalize(vRaySky));
    // диск солнца
    float sunsin = sqrt(1.-sundot*sundot);
    col += sunsin < uSunDiscAngleSin ? vec3(1.,0.8,0.6) : vec3(0);
    // горизонт планеты
    col *= planetIntersection(uCameraPosition, rd);
    // атмосферное рассеивание
    ResultScattering rs;
    rs = scattering(uCameraPosition, rd, uSunDirection);
    col = rs.t*LIGHT_INTENSITY + rs.i*col;
  }
  else {
    ResultScattering rs = scatteringWithIntersection(uCameraPosition, rd, uSunDirection, t);
    col = rs.t*LIGHT_INTENSITY + rs.i*col;
  }
  // засвечивание солнцем
  col += 0.2*uCameraInShadow*normalize(uSunDiscColor)*pow(sundot, 8.0);

  col =  col*mat2sRGB; // Преобразование в sRGB
  col = quantize_and_dither(col.rgb, 1./255., gl_FragCoord.xy);

#endif

  fragColor = vec4(col, 1.);
}
 