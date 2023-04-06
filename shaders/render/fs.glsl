#version 300 es

precision mediump float;

// разрешение экрана
uniform vec2 uResolution;
uniform vec2 uTextureBResolution;

// параметры времени
// x - время с момента запуска программы в секундах, 
// y - время с момента отображения предыдущего кадра
uniform vec2 uTime;

// текстуры
uniform sampler2D uTextureProgramA;
uniform sampler2D uTextureProgramB;
uniform sampler2D uTextureBlueNoise;

out vec4 fragColor;

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

  float k = uResolution.x/uResolution.y > uTextureBResolution.x/uTextureBResolution.y ? 
    uTextureBResolution.x/uResolution.x : uTextureBResolution.y/uResolution.y;
  //vec2 uv = vec2(0.5)+k/uTextureBResolution*(gl_FragCoord.xy-0.5*uResolution);

  vec2 uv = gl_FragCoord.xy/uResolution;
  vec4 bufA = texture(uTextureProgramA, uv);
  vec4 bufB = texture(uTextureProgramB, uv);
  //vec3 col = bufA.r==0. ? bufB.rgb : bufA.rgb;
  //vec3 col = -vec3(bufB.w-bufA.w)/100.;
  //vec3 col = mix(bufB.rgb, bufA.rgb, 0.75);
  vec3 col = bufB.rgb;

  col =  col*mat2sRGB; // Преобразование в sRGB
  col = pow(col, vec3(1./2.2));
  //col = quantize_and_dither(col.rgb, 1./255., gl_FragCoord.xy);
  //col = vec3(sqrt(bufA.w/30000.));
  fragColor = vec4(col, 1.);
}
 