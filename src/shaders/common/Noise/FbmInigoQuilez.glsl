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

const float distmax = 5000.;
const float distmin = 50.;
//const mat2 im2 = mat2(1,0,0,1);
const mat2 im2 = mat2(0.8,-0.6,0.6,0.8);

// Генерация высоты с эррозией и c вычислением нормали
// возвращает
// w - значение
// xyz - частные производные
vec4 terrainFbm(vec2 p, float dist) {
  float a = 0.0;
  float b = 1.0;
  vec2 d = vec2(0);
  vec4 g = ZERO_D, h = ZERO_D;
  mat2 m = mat2(1,0,0,1);
  // число октав от расстояния (вблизи 16, в далеке 9)
  float noct = 16. - (16.-9.)*pow(clamp((dist-distmin)/(distmax-distmin), 0., 1.),0.5);
  float nfract = fract(noct);
  vec4 tdx, tdy, f;
  for( int i=0; i<10/*int(noct)*/; i++ ) {
    f = noised2(m*p, tdx, tdy);
    // определение деноминатора, определяющего эрозию
    g += tdx;
    h += tdy;
    vec4 den = ONE_D + square_d(g) + square_d(h);
    f = div_d(f, den);
    // накопление значения высоты
    a += b * f.w;
    // накопление величин производных с учетом эрозии (в последнем члене вторые производные)
    // b*fr = 1.0 поэтому производные не масштабируются
    d += f.xy * m;
    //d += (f.xy/den - 2.*f.w*(g.w*g.xy+h.w*h.xy)/den2) * m;
    b *= 0.5;                  // уменьшение амплитуды следующей октавы
    p *= 2.0;                  // увеличение частоты следующей октавы
    //m = im2 * m;               // вращение плоскости
  }
  /*
  f = noised2(m*p, tdx, tdy);
  g += tdx;
  h += tdy;
  float den = (1. + square(g.w) + square(h.w))/nfract;
  float den2 = den*den;
  a += b*f.w/den;
  scale += b/den;
  d += (f.xy/den - 2.*f.w*(g.w*g.xy+h.w*h.xy)/den2) * m;
  */
  return vec4(-d, 1, a);
}
