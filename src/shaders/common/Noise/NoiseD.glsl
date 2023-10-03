#define NOISE_MODULE

uniform sampler2D uTextureGrayNoise;

// value noise, and its analytical derivatives
vec3 noised(vec2 x) {
  vec2 f = fract(x);
  vec2 u = f*f*(3.0-2.0*f);
  vec2 du = 6.0*f*(1.0-f);

  vec2 p = floor(x);
  float a = textureLod(uTextureGrayNoise, (p+vec2(0.5,0.5))/256.0, 0.0 ).x;// * 2. - 1.;
  float b = textureLod(uTextureGrayNoise, (p+vec2(1.5,0.5))/256.0, 0.0 ).x;// * 2. - 1.;
  float c = textureLod(uTextureGrayNoise, (p+vec2(0.5,1.5))/256.0, 0.0 ).x;// * 2. - 1.;
  float d = textureLod(uTextureGrayNoise, (p+vec2(1.5,1.5))/256.0, 0.0 ).x;// * 2. - 1.;

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
  float a = textureLod(uTextureGrayNoise, (p+vec2(0.5,0.5))/256.0, 0.0 ).x;// * 2. - 1.;
  float b = textureLod(uTextureGrayNoise, (p+vec2(1.5,0.5))/256.0, 0.0 ).x;// * 2. - 1.;
  float c = textureLod(uTextureGrayNoise, (p+vec2(0.5,1.5))/256.0, 0.0 ).x;// * 2. - 1.;
  float d = textureLod(uTextureGrayNoise, (p+vec2(1.5,1.5))/256.0, 0.0 ).x;// * 2. - 1.;

  float abcd = a-b-c+d;
  vec2 d2u = u.yx*abcd + vec2(b,c) - a;
  vec2 d2 = d2u * 6.0*(1.0-2.0*f);  // вторые производные d2/(dx dx) d2/(dy dy)
  float dxy = abcd*du.x*du.y;  // вторые производные d2/(dx dy) = d2/(dy dx)
  vec2 d1 = du*d2u; 

  dx = vec4(d2.x, dxy, 0, d1.x);
  dy = vec4(dxy, d2.y, 0, d1.y);
  return vec4(d1, 0, (a+(b-a)*u.x+(c-a)*u.y+abcd*u.x*u.y));
}
