#define FBMNOISE_MODULE
// ----------------------------------------------------------------------------
// Модуль расчета фрактального шума методом, описанным Inigo Quilez
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// Модуль функций автоматического дифференцирования
// ----------------------------------------------------------------------------
#ifndef AUTODIFF_MODULE
#include "src/shaders/common/Autodiff/Autodiff.glsl";
#endif

// ----------------------------------------------------------------------------
// Модуль функций шума
// ----------------------------------------------------------------------------
#ifndef NOISE_MODULE
#include "src/shaders/common/Noise/NoiseD.glsl";
#endif

/*
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
    vec4 n = noised(f*p);
    d += b*n.xy*f;                // accumulate derivatives (note that in this case b*f=1.0)
    a += b*n.w;///(1.+dot(d,d));  // accumulate values
    b *= 0.5;                     // amplitude decrease
    f *= 2.0;                     // frequency increase
  }
  return vec4(-d.x, -d.y, 1, a);
}
*/

const float distmax = 5000.;
const float distmin = 50.;
const mat2 im2 = mat2(0.8, -0.6, 0.6, 0.8);

// Генерация высоты с эррозией и c вычислением нормали
// возвращает
// w - значение
// xyz - частные производные
vec4 terrainFbm(vec2 p, float dist) {
  float b = 1.0;
  vec4 a = ZERO_D;
  vec4 g = ZERO_D, h = ZERO_D;
  mat2 m = mat2(1);
  // число октав от расстояния (вблизи 16, в далеке 9)
  //float noct = 16. - (16.-9.)*pow(clamp((dist-distmin)/(distmax-distmin), 0., 1.),0.5);
  //float nfract = fract(noct);
  vec4 tdx, tdy, f;
  for( int i=0; i<12/*int(noct)*/; i++ ) {
    f = noised2(m*p, tdx, tdy);
    // коррекция производных гладкого шума из-за наличия множителя у аргумента функции
    f.xy *= m;
    tdx.xy *= m; tdy.xy *= m;
    // накопление частных производных
    g += tdx; h += tdy;
    // определение деноминатора, определяющего эрозию
    vec4 den = ONE_D + square_d(g) + square_d(h);
    // накопление значения высоты
    a += b*div_d(f, den);
    b *= 0.5;                  // уменьшение амплитуды следующей октавы
    m = im2 * m * 2.;          // вращение плоскости с одновременным увеличением частоты следующей октавы
  }
  /*
  // добавление дробной части октавы
  f = noised2(m*p, tdx, tdy);
  f.xy *= m;
  tdx.xy *= m; tdy.xy *= m;
  g += tdx; h += tdy;
  vec4 den = ONE_D + (square_d(g) + square_d(h));
  a += nfract*b*div_d(f, den);
  */
  return vec4(-a.xy, 1, a.w);
}
