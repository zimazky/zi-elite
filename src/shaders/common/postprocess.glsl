#define POSTPROC_MODULE

// ----------------------------------------------------------------------------
// Модуль определения функций постобработки
// ----------------------------------------------------------------------------

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
 * Преобразование в sRGB из линейного пространства
 * На входе и выходе значения в диапазоне [0, 1]
 */
vec3 linearToSRGB(vec3 c) {
  return mix(c * 12.92, 1.055*pow(c, vec3(1./2.4)) - 0.055, greaterThan(c, vec3(0.0031308)));
}

vec4 linearToSRGB(vec4 c) {
  vec3 r = mix(c.rgb * 12.92, 1.055*pow(c.rgb, vec3(1./2.4)) - 0.055, greaterThan(c.rgb, vec3(0.0031308)));
  return vec4(r, c.a);
}

/** 
 * Преобразование в линейное пространство из sRGB
 * На входе и выходе значения в диапазоне [0, 1]
 */
vec3 sRGBtoLinear(vec3 c) {
  return mix(c / 12.92, pow((c+0.055)/1.055, vec3(2.4)), greaterThan(c, vec3(0.04045)));
}

vec4 sRGBtoLinear(vec4 c) {
  vec3 r = mix(c.rgb / 12.92, pow((c.rgb+0.055)/1.055, vec3(2.4)), greaterThan(c.rgb, vec3(0.04045)));
  return vec4(r, c.a);
}

/**
 * Квантование цвета и дитеринг (добавление шума, чтобы не было резких переходов между квантами цвета)
 * quant = 1./255.
 */
vec3 quantize_and_dither(vec3 col, float quant, vec2 fcoord) {
	vec3 noise = .5/65536. +
    texelFetch( uTextureBlueNoise, ivec2( fcoord / 8. ) & ( 1024 - 1 ), 0 ).xyz * 255./65536. +
    texelFetch( uTextureBlueNoise, ivec2( fcoord )		 & ( 1024 - 1 ), 0 ).xyz * 255./256.;
	vec3 c0 = floor( linearToSRGB( col ) / quant ) * quant;
	vec3 c1 = c0 + quant;
	vec3 discr = mix( sRGBtoLinear( c0 ), sRGBtoLinear( c1 ), noise );
	return mix( c0, c1, lessThan( discr, col ) );
}


vec3 quantizeDitherToSRGB(vec3 col, float quant, vec2 fcoord) {
  vec3 noise = texelFetch( uTextureBlueNoise, ivec2( fcoord ) & ( 1024 - 1 ), 0 ).rgb;
  // to range [-1..1]
  noise = 2.*noise - 1.;
  // to a symmetric triangular distribution on [-1,1] 
  // with maximal density at 0
  noise = sign(noise)*(1. - sqrt(1. - abs(noise)));
  return linearToSRGB(col) + noise*quant;
}

