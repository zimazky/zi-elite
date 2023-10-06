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

/*
vec4 noised(vec3 x) {
  vec3 p = floor(x);
  vec3 f = fract(x);
  vec3 u = f*f*(3.0-2.0*f);
  vec3 du = 6.0*f*(1.0-f);

  //vec3 u = w*w*w*(w*(w*6.0-15.0)+10.0);
  //vec3 du = 30.0*w*w*(w*(w-2.0)+1.0);

  float a = textureLod(uTextureNoise3D, (p+vec3(0.5,0.5,0.5))/256.0, 0.0 ).x;// * 2. - 1.;
  float b = textureLod(uTextureNoise3D, (p+vec3(1.5,0.5,0.5))/256.0, 0.0 ).x;// * 2. - 1.;
  float c = textureLod(uTextureNoise3D, (p+vec3(0.5,1.5,0.5))/256.0, 0.0 ).x;// * 2. - 1.;
  float d = textureLod(uTextureNoise3D, (p+vec3(1.5,1.5,0.5))/256.0, 0.0 ).x;// * 2. - 1.;
  float e = textureLod(uTextureNoise3D, (p+vec3(0.5,0.5,1.5))/256.0, 0.0 ).x;// * 2. - 1.;
  float f = textureLod(uTextureNoise3D, (p+vec3(1.5,0.5,1.5))/256.0, 0.0 ).x;// * 2. - 1.;
  float g = textureLod(uTextureNoise3D, (p+vec3(0.5,1.5,1.5))/256.0, 0.0 ).x;// * 2. - 1.;
  float h = textureLod(uTextureNoise3D, (p+vec3(1.5,1.5,1.5))/256.0, 0.0 ).x;// * 2. - 1.;

  // float k0 =   a;
  // float k1 =   b - a;
  // float k2 =   c - a;
  // float k3 =   e - a;
  // float k4 =   a - b - c + d;
  // float k5 =   a - c - e + g;
  // float k6 =   a - b - e + f;
  // float k7 = - a + b + c - d + e - f - g + h;
  // return vec4( -1.0+2.0*(k0 + k1*u.x + k2*u.y + k3*u.z + k4*u.x*u.y + k5*u.y*u.z + k6*u.z*u.x + k7*u.x*u.y*u.z),
  //                2.0* du * vec3( k1 + k4*u.y + k6*u.z + k7*u.y*u.z,
  //                                k2 + k5*u.z + k4*u.x + k7*u.z*u.x,
  //                                k3 + k6*u.x + k5*u.y + k7*u.x*u.y ) );

  float fe = f - e;
  vec3 k123 = vec3(b, c, e) - a;
  vec3 k456 = vec3(d-c, g-e, fe) - k123;
  float k7 =  h - k456.x - fe - g;
  vec3 u2 = k456 * u.yzx;

  return vec4(
    -1.0+2.0*(a + dot(k123, u) + dot(u2, u) + k7*u.x*u.y*u.z),
    2.0* du * (k123 + u2 + (k456.zxy + k7*u.yzx) * u.zxy)
  );
}

*/