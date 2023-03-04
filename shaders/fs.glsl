#version 300 es

precision mediump float;

uniform vec2 uResolution;
uniform vec2 uTime;
uniform sampler2D uTexture;

uniform vec4 uCameraPosition;
uniform vec3 uCameraVelocity;
uniform vec3 uCameraRotationSpeed;
uniform vec4 uCameraQuaternion;
uniform float uCameraViewAngle;

uniform vec4 uScreenMode;
uniform float uMapScale;

out vec4 fragColor;


// ----------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------
const float PI = 3.14159265358979;
const float SQRT2 = sqrt(2.);
const mat3  IDENTITY = mat3(vec3(1,0,0),vec3(0,1,0),vec3(0,0,1));

// View modes
const float FRONT_VIEW = 0.;
const float MAP_VIEW = 1.;
const float DEPTH_VIEW = 2.;
// Map modes
const int MAP_ONLY = 0;
const int MAP_GRID = 1;
const int MAP_HEIGHTS = 2;

// ----------------------------------------------------------------------------
// Операции с кватернионами
// ----------------------------------------------------------------------------
vec4 qInvert(vec4 q) { return vec4(-q.xyz, q.w)/dot(q, q); }

vec4 qMul(vec4 a, vec4 b) { 
  return vec4(
    a.w*b.x + a.x*b.w + a.y*b.z - a.z*b.y,
    a.w*b.y + a.y*b.w + a.z*b.x - a.x*b.z,
    a.w*b.z + a.z*b.w + a.x*b.y - a.y*b.x,
    a.w*b.w - dot(a.xyz, b.xyz)
  ); 
}

vec3 qRotate(vec4 q, vec3 p) { return qMul(qMul(q, vec4(p, 0.)), qInvert(q)).xyz; }

mat3 qMat3(vec4 q) { return mat3(qRotate(q, vec3(1,0,0)), qRotate(q, vec3(0,1,0)), qRotate(q, vec3(0,0,1))); }

vec4 qAngle(vec3 axis, float angle) { return vec4(normalize(axis)*sin(angle/2.), cos(angle/2.)); }

vec4 qYyawPitchRoll(float yaw, float pitch, float roll)
{ return qMul(qAngle(vec3(1,0,0), pitch), qMul(qAngle(vec3(0,1,0),yaw), qAngle(vec3(0,0,1),roll))); }

// ----------------------------------------------------------------------------
// Генерация ландшафта
// ----------------------------------------------------------------------------

// value noise, and its analytical derivatives
vec3 noised(vec2 x) {
  vec2 f = fract(x);
  //vec2 u = f*f*f*(f*(f*6.0-15.0)+10.0);
  //vec2 du = 30.0*f*f*(f*(f-2.0)+1.0);
    vec2 u = f*f*(3.0-2.0*f);
    vec2 du = 6.0*f*(1.0-f);

  vec2 p = floor(x);
  float a = textureLod(uTexture, (p+vec2(0.5,0.5))/256.0, 0.0 ).x;
  float b = textureLod(uTexture, (p+vec2(1.5,0.5))/256.0, 0.0 ).x;
  float c = textureLod(uTexture, (p+vec2(0.5,1.5))/256.0, 0.0 ).x;
  float d = textureLod(uTexture, (p+vec2(1.5,1.5))/256.0, 0.0 ).x;

  return vec3((a+(b-a)*u.x+(c-a)*u.y+(a-b-c+d)*u.x*u.y),
               du*(u.yx*(a-b-c+d) + vec2(b,c) - a));
}

const mat2 im2 = mat2(0.8,-0.6,0.6,0.8);
const float W_SCALE = 3000.; // масштаб по горизонтали
const float H_SCALE = 1100.; // масштаб по высоте
const float MAX_TRN_ELEVATION = 1.8*H_SCALE; // максимальная высота

// Генерация высоты с эррозией без производных упрощенная
float terrainH(vec2 x) {
  vec2  p = x/W_SCALE;
  float a = 0.0;
  float b = 1.0;
  vec2  d = vec2(0.0);
  for( int i=0; i<16; i++ ) {
    vec3 n = noised(p);
    d += n.yz; a += b*n.x/(1.+dot(d,d));
    b *= 0.5; p = im2*p*2.0;
  }
  return H_SCALE*a;
}
float terrainM(vec2 x) {
  vec2  p = x/W_SCALE;
  float a = 0.0;
  float b = 1.0;
  vec2  d = vec2(0.0);
  for( int i=0; i<9; i++ ) {
    vec3 n = noised(p);
    d += n.yz; a += b*n.x/(1.+dot(d,d));
    b *= 0.5; p = im2*p*2.0;
  }
  return H_SCALE*a;
}
float terrainS(vec2 x) {
  vec2  p = x/W_SCALE;
  float a = 0.0;
  float b = 1.0;
  vec2  d = vec2(0.0);
  for( int i=0; i<5; i++ ) {
    vec3 n = noised(p);
    d += n.yz; a += b*n.x/(1.+dot(d,d));
    b *= 0.5; p = im2*p*2.0;
  }
  return H_SCALE*a;
}

vec3 calcNormalH(vec3 pos, float t) {
  vec2 eps = vec2(0.001*t, 0.0);
  return normalize(vec3(
    terrainH(pos.xz-eps.xy) - terrainH(pos.xz+eps.xy),
    2.0*eps.x,
    terrainH(pos.xz-eps.yx) - terrainH(pos.xz+eps.yx)
  ));
}

vec3 calcNormalM(vec3 pos, float t) {
  vec2 eps = vec2(0.001*t, 0.0);
  return normalize(vec3(
    terrainM(pos.xz-eps.xy) - terrainM(pos.xz+eps.xy),
    2.0*eps.x,
    terrainM(pos.xz-eps.yx) - terrainM(pos.xz+eps.yx)
  ));
}

// ----------------------------------------------------------------------------
// Материалы
// ----------------------------------------------------------------------------

struct Material {
  vec4 kd;  // rgb - diffuse color, a - opacity, a<0 для источника света
  vec4 ks;  // rgb - specular color, a - glossiness
};

Material matGrass = Material(vec4(0.15*vec3(0.30,.30,0.10),1.),vec4(0));
Material matRockDark = Material(vec4(vec3(0.08,0.05,0.03),1.),vec4(vec3(0.02),0.3));
Material matRockLight = Material(vec4(vec3(0.10,0.09,0.08),1.),vec4(vec3(0.02),0.3));
Material matSand = Material(vec4(0.20*vec3(0.45,.30,0.15),1.),vec4(0));
Material matSnow = Material(vec4(0.29*vec3(0.62,0.65,0.7),1.),vec4(vec3(0.2),0.3));



// ----------------------------------------------------------------------------
// Камера
// ----------------------------------------------------------------------------
struct Camera {
  vec3 pos;
  float angle; // полный угол камеры по x
  vec4 quat;   // кватернион, определяющий ориентацию
};

// Получение луча камеры
vec3 rayCamera(Camera c, vec2 uv) {
  float t = tan(0.5*c.angle);
  return qRotate(c.quat,normalize(vec3(uv*t,-1.)));
}

// ----------------------------------------------------------------------------
// Рендеринг
// ----------------------------------------------------------------------------

// функция определения затененности
const float SUN_DISC_ANGLE_TAN = 0.03;
float softShadow(vec3 ro, vec3 rd, float dis) {
  float minStep = clamp(0.01*dis,5.,500.0);

  float res = 1.0;
  float t = 0.01;
  for(int i=0; i<80; i++) { // меньшее кол-во циклов приводит к проблескам в тени
	vec3 p = ro + t*rd;
    if(p.y>MAX_TRN_ELEVATION) break;
    float h = p.y - terrainS(p.xz);
	res = min(res, 25.*h/t);
    if(res<0.01) break;
    t += max(minStep, 0.6*h); // коэффициент устраняет полосатость при плавном переходе тени
  }
  return clamp(res,0.,1.);
  //return smoothstep(0.,SUN_DISC_ANGLE_TAN,res);
}

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

const mat2 m2 = mat2(0.8,-0.6,0.6,0.8);
float fbm(vec2 p)
{
  float f = 0.0;
  f += 0.5000*texture(uTexture, p/256.0 ).x; p = m2*p*2.02;
  f += 0.2500*texture(uTexture, p/256.0 ).x; p = m2*p*2.03;
  f += 0.1250*texture(uTexture, p/256.0 ).x; p = m2*p*2.01;
  f += 0.0625*texture(uTexture, p/256.0 ).x;
  return f/0.9375;
}

// определение цвета пикселя
Material terrain_color(vec3 pos, vec3 nor) {
  // мелкий шум в текстуре
  float r = texture(uTexture, 400.0*pos.xz/W_SCALE ).x;
  // полосы на скалах
  vec3 kd = (r*0.25+0.75)*0.9*mix( vec3(0.08,0.05,0.03),
                 vec3(0.10,0.09,0.08), 
                 texture(uTexture, vec2(0.0077*pos.x/W_SCALE,0.3*pos.y/H_SCALE)).x);
  //kd = vec3(0.05);
  // песок
  float sn = smoothstep(0.7,0.9,nor.y);
  kd = mix(kd, 0.20*vec3(0.45,.30,0.15)*(0.50+0.50*r),sn);
  // трава
  float gh = 1.-smoothstep(500.,600.,pos.y);
  float gn = smoothstep(0.60,1.0,nor.y);
  kd = mix(kd,0.15*vec3(0.30,.30,0.10)*(0.25+0.75*r),gh*gn);
  
  // мелкие и крупные пятна на скалах и траве
  kd *= 0.1+1.6*sqrt(fbm(pos.xz*1.1)*fbm(pos.xz*0.03));
  float ks = 0.02*(1.-gh*gn);
  float spec = 0.3*(1.-gh*gn*sn);

  // снег на высоте от 800 м 
  float h = smoothstep(800.0,1000.0,pos.y + 250.0*fbm(pos.xz/W_SCALE));
  // угол уклона
  float e = smoothstep(1.0-0.5*h,1.0-0.1*h,nor.y);
  // северное направление
  float o = 0.3 + 0.7*smoothstep(0.,0.1,-nor.z+h*h);
  float s = h*e*o;
  ks = mix(ks,0.2,s);
  spec = mix(spec,0.3,s);
  kd = mix(kd, 0.29*vec3(0.62,0.65,0.7), smoothstep(0.1, 0.9, s));
  return Material(vec4(kd,1.),vec4(vec3(ks),spec));
}

const float kMaxT = 30000.0;
const vec3 AMBIENT_LIGHT = vec3(0.3,0.5,0.85);
const vec3 SUN_LIGHT = vec3(8.00,5.00,3.00);
const vec3 FOG_COLOR = vec3(0.26,0.4225,0.65);
const vec3 HORIZON_COLOR = vec3(0.272,0.442,0.68);

vec4 render(vec3 ro, vec3 rd, float initDist)
{

  float sundir = 0.001*uTime.x;
  vec3 light1 = normalize(vec3(sin(sundir),0.4,cos(sundir)));
  // bounding plane
  float tmin = initDist;
  float tmax = kMaxT;
  // косинус угла между лучем и солнцем 
  float sundot = clamp(dot(rd,light1),0.,1.);
  vec3 col;
  float t = raycast(ro, rd, tmin, tmax);
  if(t>tmax) {
    // sky		
    col = AMBIENT_LIGHT - rd.y*rd.y*0.5; // градиент по высоте атмосферы
    col = mix(col, 0.85*vec3(0.7,0.75,0.85), pow(1.0-max(rd.y,0.0), 4.0));
    // sun
    col += 0.25*vec3(1.0,0.7,0.4)*pow(sundot,5.0);
    col += 0.25*vec3(1.0,0.8,0.6)*pow(sundot,64.0);
    col += 0.2*vec3(1.0,0.8,0.6)*pow(sundot,512.0);
    // clouds
    /*
    vec2 sc = ro.xz + rd.xz*(10000.0-ro.y)/rd.y;
    col = mix(col, vec3(1.0,0.95,1.0), 0.5*smoothstep(0.5,0.8,fbm(0.00005*sc)));
    */
    // horizon
    col = mix( col, HORIZON_COLOR, pow(1.0-max(rd.y,0.0), 16.0));
    t = -1.0;
  }
  else {
    // mountains		
    vec3 pos = ro + t*rd;
    vec3 nor = calcNormalH(pos, max(200.,t));
    vec3 hal = normalize(light1-rd);
        
    // цвет
    Material mat = terrain_color(pos, nor);
    vec3 kd = mat.kd.rgb;

    // lighting		
    
    // ambient
    float amb = clamp(0.5+0.5*nor.y,0.0,1.0);
	float dif = dot(light1, nor);
    float shd = dif<0. ? 0. : softShadow(pos-2.5*rd, light1, t);
	dif = clamp(dif, 0.0, 1.0);

	col = (AMBIENT_LIGHT*amb + SUN_LIGHT*dif*shd)*kd;
    
    // specular
    float n = exp2(12.*mat.ks.a);
    vec3 ks = mat.ks.rgb;
    ks *= 0.5*(n+1.)/PI;
    float RdotV = clamp(dot(reflect(light1, nor), rd), 0., 1.);
    col += ks*(SUN_LIGHT*shd*dif*pow(RdotV,n)+AMBIENT_LIGHT*pow(amb,n));

////////////////////
/*
	col = kd;
    float bac = clamp(0.2 + 0.8*dot(normalize(vec3(-light1.x, 0.0, light1.z)), nor), 0.0, 1.0);

    vec3 lin  = vec3(0.0);
    // цветной ореол у тени
    lin += dif*vec3(8.00,5.00,3.00)*1.3*vec3(shd, shd*shd*0.5+0.5*shd, shd*shd*0.8+0.2*shd);
    lin += amb*vec3(0.40,0.60,1.00)*1.2;
    //lin += bac*vec3(0.40,0.50,0.60);
	col *= lin;


    vec3 ref = reflect( rd, nor );
    float fre = clamp( 1.0+dot(rd,nor), 0.0, 1.0 );

    float h = smoothstep(800.0,1000.0,pos.y + 250.0*fbm(pos.xz/W_SCALE) );
    float e = smoothstep(1.0-0.5*h,1.0-0.1*h,nor.y);
    float o = 0.3 + 0.7*smoothstep(0.0,0.1,nor.x+h*h);

    float s = h*e*o;
    float gh = smoothstep(500.,600.,pos.y);

    //specular
    
    col += (0.+0.2*gh)*(0.04+0.96*pow(clamp(1.0+dot(hal,rd),0.0,1.0),5.0))*
               vec3(7.0,5.0,3.0)*dif*shd*
               pow( clamp(dot(nor,hal), 0.0, 1.0),16.0);
       
    col += s*0.65*pow(fre,4.0)*vec3(0.3,0.5,0.6)*smoothstep(0.0,0.6,ref.y);
*/
//////////////////
	// fog
    float fo = 1.0-exp(-pow(0.00009*t,1.5) );
    col = mix(col, FOG_COLOR, fo );

	}
  // sun scatter
  col += 0.3*vec3(1.0,0.7,0.3)*pow( sundot, 8.0 );
  return vec4( col, t );
}

float grid(float x, float st) {
  float s = 2.*x/st;
  float a = fract(s);
  s = floor(mod(s,2.));
  return pow(mix(a,1.-a,s),.2);
}

vec2 grid(vec2 x, float st) {
  vec2 s = 2.*x/st;
  vec2 a = fract(s);
  s = floor(mod(s,2.));
  return mix(a,1.-a,s);
}

const float INIT_MAP_SCALE = 5000.; //начальный масштаб карты в м на ширину карты
vec4 showMap(Camera c, vec2 uv, int mode) {
  float mapScale = 1.; // uMapScale;//memload(iChannel0, MAP_SCALE).x;
  mapScale *= INIT_MAP_SCALE;
  vec2 p = c.pos.xz + vec2(1,-1)*mapScale*uv;
  float h = terrainM(p);
  vec3 nor = calcNormalM(vec3(p.x,h,p.y), 100.);
  Material mat = terrain_color(vec3(p.x,h,p.y), nor);
  vec3 col = 0.3+0.6*vec3(dot(nor.xyz,normalize(vec3(-1,1,-1))))*10.*mat.kd.rgb;
  // положение камеры
  col *= smoothstep(.01,0.012,length(c.pos.xz-p)/mapScale);
  // направление камеры
  vec2 camdir = qRotate(c.quat,vec3(0,0,-1)).xz;
  vec2 rp = c.pos.xz-p;
  col *= dot(rp,camdir)<0. ? smoothstep(0.0,0.002,abs(camdir.x*rp.y-camdir.y*rp.x)/mapScale) : 1.;
  if((mode & MAP_GRID)!=0) {
    // координатная сетка, по 500м на линию
    vec2 gr = smoothstep(0.,0.06, grid(p,500.));
    col *= gr.x*gr.y;
  }
  // уровни высот, по 50м на уровень
  col *= (mode & MAP_HEIGHTS)!=0 ? smoothstep(0.,1., grid(h,50.)) : 1.;
  return vec4(col,-1.);
}

void main(void) {
  vec2 uv = (gl_FragCoord.xy - 0.5*uResolution.xy)/uResolution.y;
  //vec2 m = iMouse.xy-0.5*iResolution.xy;
  
  //vec2 uv2 = fragCoord/iResolution.xy;
  // значение на предыдущем кадре
  //vec4 data = texture(iChannel2, uv2);
  //float zbuf = data.w;

  
  vec4 pos = uCameraPosition;// memload(iChannel0,CAMERA_POSITION);
  float angle = uCameraViewAngle;// memload(iChannel0,CAMERA_VIEW_ANGLE).x;
  Camera c = Camera(pos.xyz, angle, uCameraQuaternion);// memload(iChannel0,CAMERA_QUATERNION));
  vec3 rd = rayCamera(c, uv);
  float t = -1.;
  //vec4 screen = uScreenMode;// memload(iChannel0,SCREEN_MODE);
  vec4 col = vec4(0.);
  //if(screen.x==MAP_VIEW) col = showMap(c, uv, int(screen.y));
  //else 
    col = render(c.pos, rd, 1.);
  //if(screen.x == DEPTH_VIEW) fragColor = vec4(1.-vec3(pow(col.w/500.,0.1)), col.w);
  //else 

  
  vec3 color = pow(col.rgb, vec3(1.0/2.2)); // Gamma correction
  fragColor = vec4( color, 1. );
}
