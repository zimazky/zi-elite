import { smoothstep } from "./mathutils";
import { Vec3 } from "./vectors";

const LIGHT_INTENSITY = 12.;      // Интенсивность света
const PLANET_POS = Vec3.ZERO();   // Положение планеты
const PLANET_RADIUS = 6371e3;     // Радиус планеты
const PLANET_RADIUS_SQR = PLANET_RADIUS*PLANET_RADIUS; // Квадрат радиуса планеты
const ATM_RADIUS = 6471e3;        // Радиус атмосферы
const ATM_RADIUS_SQR = ATM_RADIUS*ATM_RADIUS; // Квадрат радиуса атмосферы
const SUN_DISC_ANGLE_SIN = 0.5*0.01745; // Синус углового размера солнца

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

  betaRayleigh: Vec3 = new Vec3(5.5e-6, 13.0e-6, 22.4e-6); // Коэффициенты рассеивания Релея для трех частот света (rgb) на уровне моря
  betaMie: Vec3 = Vec3.ONE().mulMutable(2e-7); // Коэффициенты рассеивания Ми, не зависят от частоты света  на уровне моря
  betaAbsorption: Vec3 = new Vec3(2.04e-5, 4.97e-5, 1.95e-6); // Коэффициенты поглощения озоновым слоем
  g: number = 0.996;
  heightRayleigh: number = 8e3; // Масштабная высота для рассеивания Релея (высота 50% плотности молекул воздуха)
  heightMie: number = 1.2e3; // Масштабная высота для рассеивания Ми (высота 50% плотности крупных частиц воздуха)
  heightAbsorption: number = 30e3; // Высота максимального поглощения озоновым слоем
  absorptionFallof: number = 4e3; // Дистанция на которой поглощение озонового слоя убывает до нуля


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
  ChH(X:number, x:number, cosTheta:number): number {
    const c = 1.2533*Math.sqrt(X + x);
    // theta выше горизонта
    if(cosTheta >= 0.) return c/(c*cosTheta + 1.)*Math.exp(-x);
    // theta ниже горизонта
    else {
      const x0 = Math.sqrt(1. - cosTheta*cosTheta)*(X + x);
      const c0 = 1.2533*Math.sqrt(x0);
      return 2.*c0*Math.exp(X-x0) - c/(1.-c*cosTheta)*Math.exp(-x);
    }
  }


  /** 
   * Функция определения пересечения луча с планетой
   *   ro - положение камеры
   *   rd - направление луча
   * Возвращает true если луч пересекается с планетой
   */
  softPlanetShadow(ro: Vec3, rd: Vec3): number {
    //const pos = ro.sub(PLANET_POS);
    const pos = new Vec3(0, ro.y+PLANET_RADIUS, 0);
    const OT = pos.dot(rd); // расстояния вдоль луча до точки минимального расстояния до центра планеты
    const CT = Math.sqrt(pos.dot(pos) - OT*OT); // минимальное расстоянии от луча до центра планеты
    if(OT>0.) return 1.;
    const d = (PLANET_RADIUS-CT)/OT;
    return smoothstep(-SUN_DISC_ANGLE_SIN, SUN_DISC_ANGLE_SIN, d);
  }

  /** 
   * Функция вычисления атмосферного рассеивания
   *   ro - положение камеры
   *   rd - направление луча камеры
   *   ld - направление на источник света
   */
  scattering(ro: Vec3, rd: Vec3, ld: Vec3): ResultScattering {
    // Положение относительно центра планеты
    //const start = ro.sub(PLANET_POS);
    const start = new Vec3(0,ro.y+PLANET_RADIUS,0);

    let r2 = start.dot(start); // квадрат расстояния до центра планеты
    let OT = -start.dot(rd);   // расстояния вдоль луча до точки минимального расстояния до центра планеты
    const CT2 = r2 - OT*OT;    // квадрат минимального расстояния от луча до центра планеты
    if(CT2 >= ATM_RADIUS_SQR) return { t:Vec3.ZERO(), i:Vec3.ONE() }; // луч проходит выше атмосферы
    const AT = Math.sqrt(ATM_RADIUS_SQR-CT2); // расстояние на луче от точки на поверхности атмосферы до точки минимального расстояния до центра планеты
    let rayLen = 2.*AT; // длина луча до выхода из атмосферы или до касания с планетой, сначала считаем равной длине в сфере атмосферы
    if(r2 > ATM_RADIUS_SQR) {
      // выше атмосферы
      if(OT < 0.) return { t:Vec3.ZERO(), i:Vec3.ONE() }; // направление от планеты
      // камера выше атмосферы, поэтому переопределяем начальную точку как точку входа в атмосферу
      start.addMutable(rd.mul(OT - AT));
      r2 = ATM_RADIUS_SQR;
      OT = AT;
    }
    else rayLen = AT - start.dot(rd); // пересчитываем длину луча с учетом нахождения внутри сферы атмосферы

    const normal = start.normalize();
    const NdotD = normal.dot(rd);
    let isIntersect = false; // признак пересечения с планетой
    if(NdotD < 0.) {
      // Поиск длины луча в случае попадания в поверхность планеты
      if(CT2 < PLANET_RADIUS_SQR) {
        rayLen = OT - Math.sqrt(PLANET_RADIUS_SQR - CT2);
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
    const phaseRayleigh = 0.75 * (1.+mu2);
    const phaseMie = isIntersect ? 0. : 1.5*(1.-g2)/(2.+g2) * (1.+mu2)/Math.pow(1.+g2-2.*mu*this.g, 1.5);

    const stepSize = rayLen/NUM_STEPS; // длина шага
    const step = rd.mul(stepSize); // шаг вдоль луча
    const pos = start.add(step.mul(0.5)); // начальное смещение на половину шага для более точного интегрирования по серединам отрезков

    // оптическая глубина
    let optRayleigh = 0.;
    let optMie = 0.;
    let optAbsorption = 0.;
    const totalRayleigh = Vec3.ZERO();
    const totalMie = Vec3.ZERO();
    for(let i=0; i<NUM_STEPS; i++) {
      const height = pos.length() - PLANET_RADIUS;
      /////////////////////////////////////////////////////////////
      // TODO: плотность нужно линейно аппроксимировать на отрезке
      const densityRayleigh = stepSize*Math.exp(-height/this.heightRayleigh); // плотность частиц Релея
      const densityMie = stepSize*Math.exp(-height/this.heightMie); // плотность частиц Ми
      const d = (this.heightAbsorption-height)/this.absorptionFallof;

      // плотность частиц поглощения (озона)
      // масштабная высота поглощения соответствует высоте частиц Релея, но поглощение выражено на определенной высоте
      // использование sech функции хорошо имитирует кривую плотности частиц поглощения
      const densityAbsorption = densityRayleigh/(d*d + 1.); 
      /////////////////////////////////////////////////////////////
        
      // определение оптической глубины вдоль луча
      optRayleigh += densityRayleigh;
      optMie += densityMie;
      optAbsorption += densityAbsorption;
      
      // определение виден ли источник света из данной точки
      const OT = pos.dot(ld); // расстояния вдоль направления на свет до точки минимального расстояния до центра планеты
      const CT2 = pos.dot(pos) - OT*OT; // квадрат минимального расстояния от луча до центра планеты
      if(OT>0. || CT2 > PLANET_RADIUS_SQR)  {
        // источник света виден из данной точки
        const normal = pos.normalize();
        // косинус угла луча света к зениту
        const NdotL = normal.dot(ld);
        const height = pos.length()-PLANET_RADIUS;
        // оптическая глубина вдоль направления на свет
        const optRayleigh2 = this.heightRayleigh * this.ChH(PLANET_RADIUS/this.heightRayleigh, height/this.heightRayleigh, NdotL);
        const optMie2 = this.heightMie * this.ChH(PLANET_RADIUS/this.heightMie, height/this.heightMie, NdotL);
        //////////////////////////////////////////////////////////////////////////////
        // TODO: определить optAbsorption2
        const optAbsorption2 = 0.;
        // ослабление света за счет рассеивания
        // T(CP) * T(PA) = T(CPA) = exp{ -β(λ) [D(CP) + D(PA)]}
        const attn = 
          this.betaRayleigh.mul(-optRayleigh-optRayleigh2)
          .addMutable(this.betaMie.mul(-optMie-optMie2))
          .addMutable(this.betaAbsorption.mul(-optAbsorption-optAbsorption2))
          .exp();

        // total += T(CP) * T(PA) * ρ(h) * ds
        totalRayleigh.addMutable(attn.mul(densityRayleigh));
        totalMie.addMutable(attn.mul(densityMie));
      }
      pos.addMutable(step);
    }
    
    const inScatter = isIntersect 
      ?
      this.betaRayleigh.mul(-optRayleigh)
      .addMutable(this.betaAbsorption.mul(-optAbsorption))
      .exp()
      :
      this.betaRayleigh.mul(-optRayleigh)
      .addMutable(this.betaMie.mul(-optMie))
      .addMutable(this.betaAbsorption.mul(-optAbsorption))
      .exp();

    // I = β(λ) * γ(θ) * total
    const transmittance = 
      this.betaRayleigh.mulEl(totalRayleigh).mulMutable(phaseRayleigh)
      .addMutable(this.betaMie.mulEl(totalMie).mulMutable(phaseMie))
      .divMutable(4.*Math.PI);

    return { t: transmittance, i: inScatter };
  }


}





