// ----------------------------------------------------------------------------
// Генерация ландшафта
// ----------------------------------------------------------------------------
import { smoothstep } from "./mathutils";
import { NoiseSampler } from "./noise";
import { Mat2, Vec2, Vec3 } from "./vectors";

interface ValD2 {
  value: number;
  derivative: Vec2;
}

const im2 = new Mat2(new Vec2(0.8,-0.6), new Vec2(0.6,0.8)); // матрица поворота шума при генерации ландшафта
const W_SCALE = 3000.; // масштаб по горизонтали
const H_SCALE = 1100.; // масштаб по высоте
const MAX_TRN_ELEVATION = 1.8*H_SCALE; // максимальная высота ландшафта для вычисления теней

export class TerrainSampler {
  private _noiseSampler: NoiseSampler;

  constructor(noiseSampler: NoiseSampler) {
    this._noiseSampler = noiseSampler;
  }

  /** Генерация высоты с эррозией с высокой детализацией без аналитических производных */
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
  /** Генерация высоты с эррозией со средней детализацией без аналитических производных */
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
  /** Генерация высоты с эррозией с низкой детализацией без аналитических производных */
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

  /** Функция определения затененности */
  softShadow(ro: Vec3, rd: Vec3): number {
    const SUN_DISC_ANGLE_SIN = 0.5*0.01745; // синус углового размера солнца
    const minStep = 1.;
    let res = 1.;
    let t = 0.1;
    const cosA = Math.sqrt(1.-rd.z*rd.z); // косинус угла наклона луча от камеры к горизонтали
    for(let i=0; i<100; i++) { // меньшее кол-во циклов приводит к проблескам в тени
      const p = ro.add(rd.mul(t));
      if(p.y > MAX_TRN_ELEVATION) break;
      const h = p.y - this.terrainM(new Vec2(p.x,p.z));
      res = Math.min(res, cosA*h/t);
      if(res<-SUN_DISC_ANGLE_SIN) break;
      t += Math.max(minStep, 0.6*Math.abs(h)); // коэффициент устраняет полосатость при плавном переходе тени
    }
    //return res<0. ? 0. : (res>1. ? 1. : res);//clamp(res,0.,1.);
    return smoothstep(-SUN_DISC_ANGLE_SIN,SUN_DISC_ANGLE_SIN,res);
    //return smoothstep(0.,SUN_DISC_ANGLE_TAN,res);
  }
  
}


