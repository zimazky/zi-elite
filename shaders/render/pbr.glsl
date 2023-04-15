#define PBR_MODULE

// ----------------------------------------------------------------------------
// Physically-Based Rendering модуль
// ----------------------------------------------------------------------------

vec3 lambert(vec3 omega, float mu, float mu_0) {
	return omega;
}

vec3  lommel_seeliger(vec3 omega, float mu, float mu_0) {
 	return omega / max( 0.01, mu + mu_0 );
}

/** 
 * Функция неламбертового диффузного рассеивания.
 * Среднее законов Lambert и Lommel-Seeliger
 *   omega - альбедо
 *   omega_0 - альбедо одиночного рассеивания
 *   mu - косинус угла между нормалью и направлением на камеру
 *   mu0 - косинус угла между нормалью и направлением на источник света
 */
vec3 lunar_lambert(vec3 omega, float mu, float mu_0) {
	vec3 omega_0 = 244. * omega/(184.*omega + 61.);
	return omega_0 * ( 0.5*omega*(1.+sqrt(mu*mu_0)) + .25/max(0.4, mu+mu_0) );
}

vec4 render(vec3 ro, vec3 rd, float t0)
{
  vec3 light1 = uSunDirection;
  // косинус угла между лучем и солнцем 
  float sundot = clamp(dot(rd,light1),0.,1.);
  vec3 col = vec3(0);
  int raycastIterations = 0;
  int shadowIterations = 0;
  float t = t0>MAX_TERRAIN_DISTANCE ? 2.*MAX_TERRAIN_DISTANCE : raycast(ro, rd, t0, MAX_TERRAIN_DISTANCE, raycastIterations);
  if(t>MAX_TERRAIN_DISTANCE) {
    t = 2. * MAX_TERRAIN_DISTANCE;

  #ifdef RAYCAST_ITERATIONS_VIEW
    t = 0.;
  #endif
  
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
    if(LdotN>-xmin && shd>0.001) shd *= softShadow(pos, light1, t, shadowIterations);
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
	}

  // 1-ая световая ракета
  vec3 fd = uFlare1Position - ro;
  float fdist2 = dot(fd, fd);
  float fdist = sqrt(fdist2);
  fd /= fdist;
  float f = dot(fd, rd);
  if(f>=0.999999 && fdist<t) {
    col = uFlare1Light;
    t = fdist;
  }
  // 2-ая световая ракета
  fd = uFlare2Position - ro;
  fdist2 = dot(fd, fd);
  fdist = sqrt(fdist2);
  fd /= fdist;
  f = dot(fd, rd);
  if(f>=0.999999 && fdist<t) {
    col = uFlare2Light;
    t = fdist;
  }
}
