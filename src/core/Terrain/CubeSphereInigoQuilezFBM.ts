import { Mat3, Vec3 } from 'src/shared/libs/vectors'

import { Planet } from 'src/core/planet'

import ITerrainSampler from './ITerrainSampler'
import { AutoDiff3 } from 'src/shared/libs/AutoDiff'
import { InigoQuilezFBMNoise } from '../Noise/InigoQuilezFBMNoise'

const ONE_OVER_SQRT3 = 0.57735026918962576450914878050196

/** 
 * Генератор ландшафта в виде fbm с эрозией пирамид на кубосфере 
 * Алгоритм взят у Inigo Quilez 
*/
export class CubeSphereInigoQuilezFBMTerrain implements ITerrainSampler {
  private _planet: Planet
  private _noise: InigoQuilezFBMNoise

  W_SCALE = 3000
  H_SCALE = 1100
  MAX_TRN_ELEVATION = 1.9*this.H_SCALE
  nScale = this.H_SCALE/this.W_SCALE

  constructor(planet: Planet, noise: InigoQuilezFBMNoise) {
    this._planet = planet
    this._noise = noise
  }

  /**
   * Перевод декартовых координат точки в сферические координаты относительно центра планеты
   * Начало декартовых координат совпадает с точкой 0,0,0 на сфере
   * @param p - координаты точки
   * @returns 
   * x - долгота
   * y - широта
   * z - высота над поверхностью сферы
   */
  lonLatAlt(p: Vec3): Vec3 {
    const r = p.sub(this._planet.center);
    const phi = Math.atan2(r.y, r.x);
    const theta = Math.atan2(Math.sqrt(r.x*r.x + r.y*r.y), r.z);
    const alt = r.length() - this._planet.radius;
    return new Vec3(phi, theta, alt);
  }

  private _height_d(r: Vec3) {
    // Размер куба на который проецируется вектор для позиционирования на кубосфере 
    const cubeRad = this._planet.radius*ONE_OVER_SQRT3
    const absR = r.abs()
    let h_d: AutoDiff3
    if(absR.x > absR.y) {
      if(absR.x > absR.z) {
        const s = r.sub(r.mul((absR.x-cubeRad)/absR.x))
        h_d = this._noise.fbm(s.yz.div(this.W_SCALE))
        h_d.diff.z /= this.nScale
        // Матрица преобразования нормалей из касательного пространства относительно сферы к объектному пространству
        //  [    d    0  u/d ]
        //  [    0    d  v/d ]
        //  [ -d*u -d*v  1/d ]
        //
        // d = sqrt(u*u + v*v + 1)
        // u,v - координаты на плоскостях куба в диапазоне (-1..1)
        // u = sqrt(3)*x/R
        // v = sqrt(3)*y/R
        const uv = s.yz.div(cubeRad)
        const d = Math.sqrt(uv.dot(uv) + 1)
        const m = new Mat3(
          new Vec3(d, 0, uv.x/d),
          new Vec3(0, d, uv.y/d),
          new Vec3(-d*uv.x, -d*uv.y, 1./d)
        )
        h_d.diff = m.mulVecLeft(h_d.diff)
        h_d.diff.xyz = h_d.diff.zxy // x+
        if(r.x < 0.) h_d.diff.x = -h_d.diff.x; // x-
      }
      else {
        const s = r.sub(r.mul((absR.z-cubeRad)/absR.z))
        h_d = this._noise.fbm(s.xy.div(this.W_SCALE))
        h_d.diff.z /= this.nScale
        const uv = s.xy.div(cubeRad)
        const d = Math.sqrt(uv.dot(uv) + 1)
        const m = new Mat3(
          new Vec3(d, 0, uv.x/d),
          new Vec3(0, d, uv.y/d),
          new Vec3(-d*uv.x, -d*uv.y, 1./d)
        )
        h_d.diff = m.mulVecLeft(h_d.diff)
        //h_d.xyz = h_d.xyz; // z+
        if(r.z < 0.) h_d.diff.z = -h_d.diff.z // z-
      }
    }
    else {
      if(absR.y > absR.z) {
        const s = r.sub(r.mul((absR.y-cubeRad)/absR.y))
        h_d = this._noise.fbm(s.xz.div(this.W_SCALE))
        h_d.diff.z /= this.nScale
        const uv = s.xz.div(cubeRad)
        const d = Math.sqrt(uv.dot(uv) + 1)
        const m = new Mat3(
          new Vec3(d, 0, uv.x/d),
          new Vec3(0, d, uv.y/d),
          new Vec3(-d*uv.x, -d*uv.y, 1./d)
        )
        h_d.diff = m.mulVecLeft(h_d.diff)
        h_d.diff.xyz = h_d.diff.xzy // y+
        if(r.y < 0.) h_d.diff.y = -h_d.diff.y // y-
      }
      else {
        const s = r.sub(r.mul((absR.z-cubeRad)/absR.z))
        h_d = this._noise.fbm(s.xy.div(this.W_SCALE))
        h_d.diff.z /= this.nScale
        const uv = s.xy.div(cubeRad)
        const d = Math.sqrt(uv.dot(uv) + 1)
        const m = new Mat3(
          new Vec3(d, 0, uv.x/d),
          new Vec3(0, d, uv.y/d),
          new Vec3(-d*uv.x, -d*uv.y, 1./d)
        )
        h_d.diff = m.mulVecLeft(h_d.diff)
        //h_d.xyz = h_d.xyz; // z+
        if(r.z < 0.) h_d.diff.z = -h_d.diff.z; // z-
      }
    }
    //return new AutoDiff3(this.MAX_TRN_ELEVATION, r.normalize())
    return new AutoDiff3(this.H_SCALE*h_d.value, h_d.diff.normalize())
  }
    
  isHeightGreaterMax(p: Vec3): boolean {
    const lla = this.lonLatAlt(p)
    return lla.z > this.MAX_TRN_ELEVATION
  }

  height(p: Vec3): number {
    const r = p.sub(this._planet.center)
    return this._height_d(r).value
  }

  heightNormal(p: Vec3): AutoDiff3 {
    const r = p.sub(this._planet.center)
    return this._height_d(r)
  }
/*
  altitude(p: Vec3): number {
    const lla = this._planet.lonLatAlt(p)
    return lla.z - this.height(p)
  }
*/
  zenith(p: Vec3): Vec3 {
    return p.sub(this._planet.center).normalizeMutable()
  }

  fromCenter(p: Vec3) {
    return p.sub(this._planet.center)
  }
  
  normal(p: Vec3) {
    const eps = 0.01
    return new Vec3(
      this.height(new Vec3(p.x-eps, p.y, p.z)) - this.height(new Vec3(p.x+eps, p.y, p.z)),
      this.height(new Vec3(p.x, p.y-eps, p.z)) - this.height(new Vec3(p.x, p.y+eps, p.z)),
      this.height(new Vec3(p.x, p.y, p.z-eps)) - this.height(new Vec3(p.x, p.y, p.z+eps))
    ).normalizeMutable();
  }
}