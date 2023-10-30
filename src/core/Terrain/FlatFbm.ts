import { Vec3 } from 'src/shared/libs/vectors'

import { Planet } from 'src/core/planet'

import ITerrainSampler from './ITerrainSampler'
import { AutoDiff3 } from 'src/shared/libs/AutoDiff'
import { IFbmNoise } from 'src/core/Noise/IFbmNoise'

/** 
 * Генератор ландшафта в виде fbm на плоскости 
*/
export class FlatFbmTerrain implements ITerrainSampler {
  private _planet: Planet
  private _noise: IFbmNoise

  W_SCALE = 3000
  H_SCALE = 1100
  MAX_TRN_ELEVATION = 1.9*this.H_SCALE
  nScale = this.H_SCALE/this.W_SCALE

  constructor(planet: Planet, noise: IFbmNoise) {
    this._planet = planet
    this._noise = noise
  }

  /**
   * Перевод декартовых координат точки в псевдосферические координаты для плоской поверхности
   * @param p - координаты точки
   * @returns 
   * x - долгота
   * y - широта
   * z - высота над поверхностью сферы
   */
  lonLatAlt(p: Vec3): Vec3 { return p.xzy }
  altitude(p: Vec3): number { return p.y }

  private _height_d(pos: Vec3) {
    const h_d = this._noise.fbm(pos.xz.div(this.W_SCALE))
    h_d.diff.z /= this.nScale
    return new AutoDiff3(this.H_SCALE*h_d.value, h_d.diff.xzy.normalize())
  }
    
  height(p: Vec3): number { return this._height_d(p).value }

  heightNormal(p: Vec3): AutoDiff3 { return this._height_d(p) }

  zenith(p: Vec3): Vec3 { return Vec3.J }

  fromCenter(p: Vec3) { return new Vec3(0, p.y + this._planet.radius, 0) }
  
  normal(p: Vec3) {
    const eps = 0.01
    return new Vec3(
      this.height(new Vec3(p.x-eps, p.y, p.z)) - this.height(new Vec3(p.x+eps, p.y, p.z)),
      2*eps,
      this.height(new Vec3(p.x, p.y, p.z-eps)) - this.height(new Vec3(p.x, p.y, p.z+eps))
    ).normalizeMutable();
  }
}