#define AUTODIFF_MODULE
// ----------------------------------------------------------------------------
// Функции автоматического дифференцирования
//
// Числа представляются составными:
// xyz - частные производные по трем координатам x, y, z
// w - значение функции
// ----------------------------------------------------------------------------

float square(float x) { return x*x; }

const vec3 ZERO = vec3(0);
const vec4 HALF_D = vec4( ZERO, .5 );
const vec4 ONE_D = vec4( ZERO, 1 );
const vec4 TWO_D = vec4( ZERO, 2 );
const vec4 ZERO_D = vec4(0);

vec4 abs_d( vec4 a ) { return a * sign( a.w ); }
vec4 asin_d( vec4 a ) { return vec4( a.xyz * inversesqrt( 1. - a.w * a.w ), asin( a.w ) ); }
vec4 atan_d( vec4 a ) { return vec4( a.xyz / ( 1. + a.w * a.w ), atan( a.w ) ); }
vec4 atan2_d( vec4 a, vec4 b ) {
  return vec4( ( a.xyz * b.w - b.xyz * a.w ) / ( square( b.w ) * ( 1. + square( a.w / b.w ) ) ), atan( a.w, b.w ) );
}
vec4 atanh_d( vec4 a ) { return vec4( a.xyz / ( 1. - a.w * a.w ), atanh( a.w ) ); }
vec4 clamp_d( vec4 x, vec4 a, vec4 b ) { return x.w < a.w ? a : x.w < b.w ? x : b; }
vec4 const_d( float x ) { return vec2( 0, x ).xxxy; }
vec4 cos_d( vec4 a ) { return vec4( -a.xyz * sin( a.w ), cos( a.w ) ); }
vec4 cosh_d( vec4 a ) { return vec4( a.xyz * sinh( a.w ), cosh( a.w ) ); }
vec4 div_d( vec4 a, vec4 b ) { return vec4( ( a.xyz * b.w - a.w * b.xyz ) / square( b.w ), a.w / b.w ); }
vec4 exp_d( vec4 a ) { return exp( a.w ) * vec4( a.xyz, 1 ); }
vec4 hypot_d( vec4 a, vec4 b ) { float h = sqrt( a.w * a.w + b.w * b.w ); return vec4( ( a.xyz * a.w + b.xyz * b.w ) / h, h ); }
vec4 log_d( vec4 a ) { return vec4( a.xyz / a.w, log( a.w ) ); }
vec4 max_d( vec4 a, vec4 b ) { return b.w < a.w ? a : b; }
vec4 min_d( vec4 a, vec4 b ) { return a.w < b.w ? a : b; }
vec4 mix_d( vec4 a, vec4 b, vec4 t ) { return mix( a, b, t.w ) + vec4( t.xyz, 0 ) * ( b.w - a.w ); }
vec4 mul_d( vec4 a, vec4 b ) { return a * b.w + vec4( a.w * b.xyz, 0 ); }
vec4 pow_d( vec4 a, float b ) { return a * pow( a.w, b - 1. ) * vec2( b, 1 ).xxxy; }
vec4 saturate_d( vec4 a ) { return a.w < 0. ? ZERO_D : a.w < 1. ? a : ONE_D; }
vec4 sin_d( vec4 a ) { return vec4( a.xyz * cos( a.w ), sin( a.w ) ); }
vec4 sinh_d( vec4 a ) { return vec4( a.xyz * cosh( a.w ), sinh( a.w ) ); }
vec4 smin1_d( vec4 a, float S ) {
  vec4 arg = ( ONE_D - a ) / S;
  return arg.w < 16. ? ONE_D - log_d( ONE_D + exp_d( arg ) ) * S : a;
}
vec4 sqrt_d( vec4 a ) { return a * inversesqrt( a.w ) * vec2( .5, 1 ).xxxy; }
vec4 square_d( vec4 a ) { return a * a.w * vec2( 2, 1 ).xxxy; }
vec4 tan_d( vec4 a ) { float t = tan( a.w ); return vec4( a.xyz * ( 1. + t * t ), t ); }
vec4 tanh_d( vec4 a ) { float t = tanh( a.w ); return vec4( a.xyz * ( 1. - t * t ), t ); }

