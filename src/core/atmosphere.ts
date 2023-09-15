import { Vec3 } from "src/shared/libs/vectors";

import { Planet } from "./planet";

const PI_CUBE = Math.PI*Math.PI*Math.PI;
const SQRTPILN2HALF = 1.04345246;
const ONE_DIV4PI = 1./(4.*Math.PI);

/** Число частиц воздуха в кубическом метре при давлении 1 атм и температуре 293К */
const N_AIR = 2.504e25;
const NUM_STEPS = 32; // Число шагов для интегрирования

/**
 * Тип результата вычисления атмосферного рассеивания
 */
type ResultScattering = {
  /** Мультипликативная часть (transmittance), цвет поглощения */
  t: Vec3;
  /** Аддитивная часть (in-scatter), цвет подсвечивания за счет рассеивания атмосферы */
  i: Vec3;
}

export class Atmosphere {

  private _planet: Planet;

  /** Радиус планеты */
  planetRadius: number;
  /** Квадрат радиуса планеты */
  planetRadius2: number;
  /** Положение центра планеты */
  planetCenter: Vec3;
  /** Радиус атмосферы */
  radius: number = 300000; // 6471e3;
  /** Квадрат радиуса атмосферы */
  radius2: number;
  /** Коэффициент преломления воздуха */
  n: number = 1.00029;
  /** Длины волн трех цветов, составляющих базу цветового пространства */
  rgbLambda: Vec3 = new Vec3(615e-9, 535e-9, 445e-9);
  /** 
   * Коэффициенты рассеивания Релея для трех частот спектра (rgb) на уровне моря,
   * определяют количество потерянной энергии при столкновении с одной частицей
   * */
  /*
  betaRayleigh: Vec3 = new Vec3(
    this.computeBetaRayleigh(this.rgbLambda.x),
    this.computeBetaRayleigh(this.rgbLambda.y),
    this.computeBetaRayleigh(this.rgbLambda.z)
    );
    */
  betaRayleigh: Vec3 = new Vec3(5.5e-6, 13.0e-6, 22.4e-6);
  betaMie: Vec3 = Vec3.ONE.mulMutable(2e-7); // Коэффициенты рассеивания Ми, не зависят от частоты света  на уровне моря
  g: number = 0.996;
  /** Коэффициент деполяризации воздуха */
  p: number = 0.035;
  heightRayleigh: number = 8e3; // Масштабная высота для рассеивания Релея (высота 50% плотности молекул воздуха)
  heightMie: number = 1.2e3; // Масштабная высота для рассеивания Ми (высота 50% плотности крупных частиц воздуха)

  constructor(planet: Planet) {
    this._planet = planet;
    this.planetRadius = planet.radius;
    this.planetCenter = new Vec3(0., -this.planetRadius, 0.);
    this.planetRadius2 = this.planetRadius*this.planetRadius;
    this.radius2 = this.radius*this.radius;
  }

  /** 
   * Функция расчета коэффициента рассеивания Релея для света определенной длины волны 
   * Подробнее можно посмотреть "Rayleigh-scattering calculations for the terrestrial atmosphere" by A.Bucholtz
  */
  computeBetaRayleigh(lambda: number): number {
    const n2m1 = this.n*this.n - 1.;
    const l2 = lambda * lambda;
    return (8.*PI_CUBE*n2m1*n2m1*(6.+3.*this.p))/(3.*N_AIR*l2*l2*(6.-7.*this.p));
  }

  /** 
   * Приближение функции Чапмана, домноженная на exp(-x)
   * функция возвращает оптическую глубину (интеграл плотности вдоль луча от указанной высоты до бесконечности)
   *   X - референсная нормализованная высота (R/H),
   *   R - радиус планеты, 
   *   H - характеристическая (масштабная) высота плотности атмосферы (высота 50% плотности)
   *   x - нормализованная высота ((R+h)/H),
   *   h - высота над уровнем планеты
   *   cosTheta - косинус угла наклона луча к зениту
   */
  ChHOld(X:number, x:number, cosTheta:number): number {
    const R = X + x;
    const c = SQRTPILN2HALF*Math.sqrt(R);
    const cExp = c*Math.exp(-x);
    // theta выше горизонта
    if(cosTheta >= 0.) return cExp/(c*cosTheta + 1.);
    // theta ниже горизонта
    else {
      const x0 = Math.sqrt(1. - cosTheta*cosTheta)*R;
      const c0 = SQRTPILN2HALF*Math.sqrt(x0);
      return 2.*c0*Math.exp(X-x0) - cExp/(1.-c*cosTheta);
    }
  }

  
  ChH(X: number, h: number, cosTheta: number): number {
    const x = X + h;
    const c = SQRTPILN2HALF * Math.sqrt(x);
    const cexp = c * Math.exp(-h);
    // theta выше горизонта
    if(cosTheta >= 0.) return cexp/((c-1.)*cosTheta + 1.);
    // theta ниже горизонта
    else {
      const sinTheta = Math.sqrt(1.-cosTheta*cosTheta);
      return cexp/((c-1.)*cosTheta - 1.) + 2.*c*Math.exp(X - x*sinTheta)*Math.sqrt(sinTheta);
    }
  }
  
  /** 
   * Функция вычисления атмосферного рассеивания
   *   ro - положение камеры
   *   rd - направление луча камеры
   *   ld - направление на источник света
   */
  scattering(ro: Vec3, rd: Vec3, ld: Vec3): ResultScattering {
    // Положение относительно центра планеты
    const start = ro.sub(this.planetCenter);

    let r2 = start.dot(start); // квадрат расстояния до центра планеты
    let OT = -start.dot(rd);   // расстояния вдоль луча до точки минимального расстояния до центра планеты
    const CT2 = r2 - OT*OT;    // квадрат минимального расстояния от луча до центра планеты
    if(CT2 >= this.radius2) return { t:Vec3.ZERO, i:Vec3.ONE }; // луч проходит выше атмосферы
    const AT = Math.sqrt(this.radius2-CT2); // расстояние на луче от точки на поверхности атмосферы до точки минимального расстояния до центра планеты
    let rayLen = 2.*AT; // длина луча до выхода из атмосферы или до касания с планетой, сначала считаем равной длине в сфере атмосферы
    if(r2 > this.radius2) {
      // выше атмосферы
      if(OT < 0.) return { t:Vec3.ZERO, i:Vec3.ONE }; // направление от планеты
      // камера выше атмосферы, поэтому переопределяем начальную точку как точку входа в атмосферу
      start.addMutable(rd.mul(OT - AT));
      r2 = this.radius2;
      OT = AT;
    }
    else rayLen = AT - start.dot(rd); // пересчитываем длину луча с учетом нахождения внутри сферы атмосферы

    const normal = start.normalize();
    const NdotD = normal.dot(rd);
    let isIntersect = false; // признак пересечения с планетой
    if(NdotD < 0.) {
      // Поиск длины луча в случае попадания в поверхность планеты
      if(CT2 < this.planetRadius2) {
        rayLen = OT - Math.sqrt(this.planetRadius2 - CT2);
        isIntersect = true;
      }
    }
    
    // Расчет фазовой функции
    // Для рассеяния Релея постоянная g считается равной нулю, рассеяние симметрично относительно положительных и отрицательных углов
    // Для рассеяния Ми g принимают 0,76 ... 0,999.
    // Отрицательные значения g рассеивают больше в прямом направлении, а положительные - рассеивают свет назад к источнику света
    const mu = rd.dot(ld);
    const mu2 = mu * mu;
    const g2 = this.g*this.g;
    const phaseRayleigh = 0.75 * (1.+mu2) * ONE_DIV4PI;
    const phaseMie = 1.5*(1.-g2)/(2.+g2) * (1.+mu2)/Math.pow(1.+g2-2.*mu*this.g, 1.5) * ONE_DIV4PI;

    const stepSize = rayLen/NUM_STEPS; // длина шага
    const step = rd.mul(stepSize); // шаг вдоль луча
    const nextpos = start.add(step); // координаты другого конца сегмента 
    const pos = start.add(step.mul(0.5)); // координаты середины сегмента 

    // оптическая глубина
    let optRayleigh = 0.;
    let optMie = 0.;
    const totalRayleigh = Vec3.ZERO;
    const totalMie = Vec3.ZERO;
    let fDensityRayleigh = stepSize*Math.exp(-(start.length()-this.planetRadius)/this.heightRayleigh);
    let fDensityMie = stepSize*Math.exp(-(start.length()-this.planetRadius)/this.heightMie);

    for(let i=0; i<NUM_STEPS; i++, nextpos.addMutable(step), pos.addMutable(step)) {
      const height = nextpos.length() - this.planetRadius;
      const densityRayleigh = stepSize*Math.exp(-height/this.heightRayleigh); // плотность частиц Релея
      const densityMie = stepSize*Math.exp(-height/this.heightMie); // плотность частиц Ми
      // определение оптической глубины вдоль луча камеры (считаем как среднее по краям сегмента)
      optRayleigh += 0.5*(densityRayleigh + fDensityRayleigh);
      optMie += 0.5*(densityMie + fDensityMie);
      fDensityRayleigh = densityRayleigh;
      fDensityMie = densityMie;

      // определение оптической глубины вдоль луча к солнцу (считаем из средней точки сегмента)
      // определение виден ли источник света из данной точки
      const OT = pos.dot(ld); // расстояния вдоль направления на свет до точки минимального расстояния до центра планеты
      const CT2 = pos.dot(pos) - OT*OT; // квадрат минимального расстояния от луча до центра планеты
      if(OT>0. || CT2 > this.planetRadius2)  {
        // источник света виден из данной точки
        const normal = pos.normalize();
        // косинус угла луча света к зениту
        const NdotL = normal.dot(ld);
        const height = pos.length() - this.planetRadius;
        // оптическая глубина вдоль направления на свет
        const optRayleigh2 = this.heightRayleigh * this.ChH(this.planetRadius/this.heightRayleigh, height/this.heightRayleigh, NdotL);
        const optMie2 = this.heightMie * this.ChH(this.planetRadius/this.heightMie, height/this.heightMie, NdotL);
        // ослабление света за счет рассеивания
        // T(CP) * T(PA) = T(CPA) = exp{ -β(λ) [D(CP) + D(PA)]}
        const attn = 
          this.betaRayleigh.mul(-optRayleigh-optRayleigh2)
          .addMutable(this.betaMie.mul(-optMie-optMie2))
          .exp();

        // total += T(CP) * T(PA) * ρ(h) * ds
        totalRayleigh.addMutable(attn.mul(densityRayleigh));
        totalMie.addMutable(attn.mul(densityMie));
      }
    }
    
    const inScatter = isIntersect 
      ?
      this.betaRayleigh.mul(-optRayleigh)
      .exp()
      :
      this.betaRayleigh.mul(-optRayleigh)
      .addMutable(this.betaMie.mul(-optMie))
      .exp();

    // I = β(λ) * γ(θ) * total
    const transmittance = 
      this.betaRayleigh.mulEl(totalRayleigh).mulMutable(phaseRayleigh)
      .addMutable(this.betaMie.mulEl(totalMie).mulMutable(phaseMie));

    return { t: transmittance, i: inScatter };
  }

  /** 
   * Функция вычисления атмосферного рассеивания при прямом направлении на солнце
   * Определяется цвет поглощения
   *   ro - положение камеры
   *   rd - направление на источник света
   */ 
  transmittance(ro: Vec3, rd: Vec3): Vec3 {
    // Положение относительно центра планеты
    const start = ro.sub(this.planetCenter);

    let r2 = start.dot(start); // квадрат расстояния до центра планеты
    let OT = -start.dot(rd);   // расстояния вдоль луча до точки минимального расстояния до центра планеты
    const CT2 = r2 - OT*OT;    // квадрат минимального расстояния от луча до центра планеты
    if(CT2 >= this.radius2) return Vec3.ZERO; // луч проходит выше атмосферы
    const AT = Math.sqrt(this.radius2-CT2); // расстояние на луче от точки на поверхности атмосферы до точки минимального расстояния до центра планеты
    let rayLen = 2.*AT; // длина луча до выхода из атмосферы или до касания с планетой, сначала считаем равной длине в сфере атмосферы
    if(r2 > this.radius2) {
      // выше атмосферы
      if(OT < 0.) return Vec3.ZERO; // направление от планеты
      // камера выше атмосферы, поэтому переопределяем начальную точку как точку входа в атмосферу
      start.addMutable(rd.mul(OT - AT));
      r2 = this.radius2;
      OT = AT;
    }
    else rayLen = AT - start.dot(rd); // пересчитываем длину луча с учетом нахождения внутри сферы атмосферы

    const normal = start.normalize();
    const NdotD = normal.dot(rd);
    let isIntersect = false; // признак пересечения с планетой
    if(NdotD < 0.) {
      // Поиск длины луча в случае попадания в поверхность планеты
      if(CT2 < this.planetRadius2) {
        rayLen = OT - Math.sqrt(this.planetRadius2 - CT2);
        isIntersect = true;
      }
    }
    
    // Расчет фазовой функции
    // Для рассеяния Релея постоянная g считается равной нулю, рассеяние симметрично относительно положительных и отрицательных углов
    // Для рассеяния Ми g принимают 0,76 ... 0,999.
    // Отрицательные значения g рассеивают больше в прямом направлении, а положительные - рассеивают свет назад к источнику света
    const g2 = this.g*this.g;
    const phaseRayleigh = 1.5 * ONE_DIV4PI;
    const phaseMie = 1.5*(1.-g2)/(2.+g2) * 2./Math.pow(1.+g2-2.*this.g, 1.5) * ONE_DIV4PI;

    const stepSize = rayLen/NUM_STEPS; // длина шага
    const step = rd.mul(stepSize); // шаг вдоль луча
    const nextpos = start.add(step); // координаты другого конца сегмента 
    const pos = start.add(step.mul(0.5)); // координаты середины сегмента 

    // оптическая глубина
    let optRayleigh = 0.;
    let optMie = 0.;
    const totalRayleigh = Vec3.ZERO;
    const totalMie = Vec3.ZERO;
    let fDensityRayleigh = stepSize*Math.exp(-(start.length()-this.planetRadius)/this.heightRayleigh);
    let fDensityMie = stepSize*Math.exp(-(start.length()-this.planetRadius)/this.heightMie);

    for(let i=0; i<NUM_STEPS; i++, nextpos.addMutable(step), pos.addMutable(step)) {
      const nextheight = nextpos.length() - this.planetRadius;
      const densityRayleigh = stepSize*Math.exp(-nextheight/this.heightRayleigh); // плотность частиц Релея
      const densityMie = stepSize*Math.exp(-nextheight/this.heightMie); // плотность частиц Ми
      // определение оптической глубины вдоль луча камеры (считаем как среднее по краям сегмента)
      optRayleigh += 0.5*(densityRayleigh + fDensityRayleigh);
      optMie += 0.5*(densityMie + fDensityMie);
      fDensityRayleigh = densityRayleigh;
      fDensityMie = densityMie;

      // ослабление света за счет рассеивания
      // T(CP) * T(PA) = T(CPA) = exp{ -β(λ) [D(CP) + D(PA)]}
      const attn = 
        this.betaRayleigh.mul(-optRayleigh)
        .addMutable(this.betaMie.mul(-optMie))
        .exp();

      // total += T(CP) * T(PA) * ρ(h) * ds
      totalRayleigh.addMutable(attn.mul(densityRayleigh));
      totalMie.addMutable(attn.mul(densityMie));
    }
    
    // I = β(λ) * γ(θ) * total
    const transmittance = 
      this.betaRayleigh.mulEl(totalRayleigh).mulMutable(phaseRayleigh)
      .addMutable(this.betaMie.mulEl(totalMie).mulMutable(phaseMie));

    return transmittance;
  }

}





