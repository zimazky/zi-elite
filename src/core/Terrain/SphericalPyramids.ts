import { Vec2, Vec3 } from 'src/shared/libs/vectors'

import { Planet } from 'src/core/planet'

import ITerrainSampler from './ITerrainSampler'

/** масштаб по высоте */
const H_SCALE = 1100.
/** максимальная высота ландшафта */
const MAX_TRN_ELEVATION = H_SCALE

function pyramid(x: Vec2) {
  const f = Vec2.ONE.subMutable(x.fract().mulMutable(2).subMutable(Vec2.ONE).abs());
  return Math.min(f.x,f.y);
}

/** Генератор ландшафта в виде пирамид на сфере, выстроенных по сферическим координатам */
export class SphericalPyramidsTerrain implements ITerrainSampler {
  private _planet: Planet

  constructor(planet: Planet) {
    this._planet = planet
  }

  isHeightGreaterMax(p: Vec3): boolean {
    const lla = this._planet.lonLatAlt(p)
    return lla.z > MAX_TRN_ELEVATION
  }

  altitude(p: Vec3): number {
    const lla = this._planet.lonLatAlt(p)
    return lla.z - H_SCALE*pyramid(lla.xy.mul(360./Math.PI))
  }

  height(p: Vec3): number {
    const lla = this._planet.lonLatAlt(p)
    return H_SCALE*pyramid(lla.xy.mul(360./Math.PI))
  }

  zenith(p: Vec3): Vec3 {
    return p.sub(this._planet.center).normalizeMutable()
  }

  fromCenter(p: Vec3) {
    return p.sub(this._planet.center)
  }

  normal(p: Vec3) {
    const eps = 0.1
    return new Vec3(
      this.height(new Vec3(p.x-eps, p.y, p.z)) - this.height(new Vec3(p.x+eps, p.y, p.z)),
      this.height(new Vec3(p.x, p.y-eps, p.z)) - this.height(new Vec3(p.x, p.y+eps, p.z)),
      this.height(new Vec3(p.x, p.y, p.z-eps)) - this.height(new Vec3(p.x, p.y, p.z+eps))
    ).normalizeMutable()
  }
}