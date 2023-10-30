import { Vec2, Vec3 } from 'src/shared/libs/vectors'

import { Planet } from 'src/core/planet'

import ITerrainSampler from './ITerrainSampler'
import { AutoDiff3 } from 'src/shared/libs/AutoDiff'

function pyramid(x: Vec2) {
  const f = Vec2.ONE.subMutable(x.fract().mulMutable(2).subMutable(Vec2.ONE).abs());
  return Math.min(f.x,f.y);
}

/** Генератор ландшафта в виде пирамид на плоскости XZ */
export class FlatPyramidsTerrain implements ITerrainSampler {
  private _planet: Planet

  H_SCALE = 1100.
  W_SCALE = 1500.
  MAX_TRN_ELEVATION = this.H_SCALE

  constructor(planet: Planet) { this._planet = planet }

  lonLatAlt(p: Vec3): Vec3 { return p.xzy }

  height(p: Vec3): number { return this.H_SCALE*pyramid(p.xz.div(this.W_SCALE)) }

  heightNormal(p: Vec3): AutoDiff3 { return new AutoDiff3(this.height(p), this.normal(p)) }

  altitude(p: Vec3): number { return p.y }

  zenith(p: Vec3): Vec3 { return Vec3.J }

  fromCenter(p: Vec3) { return new Vec3(0, p.y+this._planet.radius, 0) }

  normal(p: Vec3) {
    const eps = 0.1
    return new Vec3(
      this.height(new Vec3(p.x-eps, p.y, p.z)) - this.height(new Vec3(p.x+eps, p.y, p.z)),
      2*eps,
      this.height(new Vec3(p.x, p.y, p.z-eps)) - this.height(new Vec3(p.x, p.y, p.z+eps))
    ).normalizeMutable()
  }
}