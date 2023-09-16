// ----------------------------------------------------------------------------
// Генерация ландшафта
// ----------------------------------------------------------------------------
import { smoothstep } from "src/shared/libs/mathutils";
import { Mat2, Vec2, Vec3 } from "src/shared/libs/vectors";

import { SUN_DISC_ANGLE_SIN } from "src/core/constants";
import { NoiseSampler } from "src/core/noise";
import { Planet } from "src/core/planet";

const im2 = new Mat2(new Vec2(0.8,-0.6), new Vec2(0.6,0.8)); // матрица поворота шума при генерации ландшафта
const W_SCALE = 3000.; // масштаб по горизонтали
const H_SCALE = 1100.; // масштаб по высоте
const MAX_TRN_ELEVATION = 1.8*H_SCALE; // максимальная высота ландшафта для вычисления теней

function pyramid(x: Vec2) {
  const f = Vec2.ONE.subMutable(x.fract().mulMutable(2).subMutable(Vec2.ONE).abs());
  return Math.min(f.x,f.y);
}

export class TerrainSampler {
  private _noiseSampler: NoiseSampler;
  private _planet: Planet;

  constructor(noiseSampler: NoiseSampler, planet: Planet) {
    this._noiseSampler = noiseSampler;
    this._planet = planet;
  }

  // Высота на сфере в зависимости от сферических координат 
  // s.x - долгота
  // s.y - широта
  terrainOnSphere(s: Vec2) {
    return H_SCALE*pyramid(s.mul(360./Math.PI));
  }

  // Вычисление нормали в точке, заданной сферическими координатами
  calcNormal(pos: Vec3, t: number) {
    const eps = 0.1;
    const llax1 = this._planet.lonLatAlt(new Vec3(pos.x+eps, pos.y, pos.z));
    const llax2 = this._planet.lonLatAlt(new Vec3(pos.x-eps, pos.y, pos.z));
    const llay1 = this._planet.lonLatAlt(new Vec3(pos.x, pos.y+eps, pos.z));
    const llay2 = this._planet.lonLatAlt(new Vec3(pos.x, pos.y-eps, pos.z));
    const llaz1 = this._planet.lonLatAlt(new Vec3(pos.x, pos.y, pos.z+eps));
    const llaz2 = this._planet.lonLatAlt(new Vec3(pos.x, pos.y, pos.z-eps));

    return new Vec3(
      this.terrainOnSphere(llax2.xy) - this.terrainOnSphere(llax1.xy),
      this.terrainOnSphere(llay2.xy) - this.terrainOnSphere(llay1.xy),
      this.terrainOnSphere(llaz2.xy) - this.terrainOnSphere(llaz1.xy)
    ).normalizeMutable();
  }


/*
  terrainH(x: Vec2) {
    return H_SCALE*pyramid(x.div(W_SCALE));
  }
  terrainM(x: Vec2) {
    return H_SCALE*pyramid(x.div(W_SCALE));
  }
  terrainS(x: Vec2) {
    return H_SCALE*pyramid(x.div(W_SCALE));
  }
*/

  /** Генерация высоты с эррозией с высокой детализацией без аналитических производных */
  /*
  terrainH(v: Vec2): number {
    let p = v.div(W_SCALE);
    let a = 0.;
    let b = 1.;
    const d = Vec2.ZERO();
    for(let i=0; i<16; i++) {
      const n = this._noiseSampler.noiseD(p);
      d.addMutable(n.derivative);
      a += b*n.value/(1.+d.dot(d));
      b *= 0.5; 
      p = im2.mul(p.add(p));
    }
    return H_SCALE*a;
  }
  */
  /** Генерация высоты с эррозией со средней детализацией без аналитических производных */
  /*
  terrainM(v: Vec2): number {
    let p = v.div(W_SCALE);
    let a = 0.;
    let b = 1.;
    const d = Vec2.ZERO();
    for(let i=0; i<9; i++) {
      const n = this._noiseSampler.noiseD(p);
      d.addMutable(n.derivative);
      a += b*n.value/(1.+d.dot(d));
      b *= 0.5; 
      p = im2.mul(p.add(p));
    }
    return H_SCALE*a;
  }
  */
  /** Генерация высоты с эррозией с низкой детализацией без аналитических производных */
  /*
  terrainS(v: Vec2): number {
    let p = v.div(W_SCALE);
    let a = 0.;
    let b = 1.;
    const d = Vec2.ZERO();
    for(let i=0; i<5; i++) {
      const n = this._noiseSampler.noiseD(p);
      d.addMutable(n.derivative);
      a += b*n.value/(1.+d.dot(d));
      b *= 0.5; 
      p = im2.mul(p.add(p));
    }
    return H_SCALE*a;
  }
*/

/*
  calcNormalM(pos: Vec3, t: number): Vec3 {
    const eps = new Vec2(0.001*t, 0.0);
    return new Vec3(
      this.terrainM(new Vec2(pos.x-eps.x, pos.z-eps.y)) - this.terrainM(new Vec2(pos.x+eps.x, pos.z+eps.y)),
      2.0*eps.x,
      this.terrainM(new Vec2(pos.x-eps.y,pos.z-eps.x)) - this.terrainM(new Vec2(pos.x+eps.y, pos.z+eps.x))
    ).normalize();
  }
*/

  /** Функция определения затененности */
  softShadow(ro: Vec3, rd: Vec3): number {
    const minStep = 1.;
    let res = 1.;
    let t = 0.1;
    const cosA = Math.sqrt(1.-rd.z*rd.z); // косинус угла наклона луча от камеры к горизонтали
    for(let i=0; i<200; i++) { // меньшее кол-во циклов приводит к проблескам в тени
      const p = ro.add(rd.mul(t));
      const lla = this._planet.lonLatAlt(p);
      if(lla.z > MAX_TRN_ELEVATION) return smoothstep(-SUN_DISC_ANGLE_SIN,SUN_DISC_ANGLE_SIN,res);
      const h = lla.z - this.terrainOnSphere(lla.xy);
      res = Math.min(res, cosA*h/t);
      if(res<-SUN_DISC_ANGLE_SIN) return smoothstep(-SUN_DISC_ANGLE_SIN,SUN_DISC_ANGLE_SIN,res);
      t += Math.max(minStep, 0.6*Math.abs(h)); // коэффициент устраняет полосатость при плавном переходе тени
    }
    return 0.; //smoothstep(-SUN_DISC_ANGLE_SIN,SUN_DISC_ANGLE_SIN,res);
  }
  
}


