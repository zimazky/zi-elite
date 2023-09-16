import { Vec2, Vec3 } from 'src/shared/libs/vectors'

import { Planet } from 'src/core/planet'

import ITerrainSampler from './ITerrainSampler'

/** масштаб по высоте */
const H_SCALE = 1100.
/** масштаб по горизонтали */
const W_SCALE = 1000.
/** максимальная высота ландшафта */
const MAX_TRN_ELEVATION = H_SCALE

function pyramid(x: Vec2) {
  const f = Vec2.ONE.subMutable(x.fract().mulMutable(2).subMutable(Vec2.ONE).abs());
  return Math.min(f.x,f.y);
}

/** Генератор ландшафта в виде пирамид на плоскости XZ */
export class FlatPyramidsTerrain implements ITerrainSampler {
  private _planet: Planet

  constructor(planet: Planet) {
    this._planet = planet
  }

  isHeightGreaterMax(p: Vec3): boolean {
    return p.y > MAX_TRN_ELEVATION
  }

  height(p: Vec3): number {
    return H_SCALE*pyramid(p.xz.div(W_SCALE))
  }

  altitude(p: Vec3): number {
    return p.y - H_SCALE*this.height(p)
  }

  zenith(p: Vec3): Vec3 {
    return Vec3.J
  }

  normal(p: Vec3) {
    const eps = 0.1
    return new Vec3(
      this.height(new Vec3(p.x-eps, p.y, p.z)) - this.height(new Vec3(p.x+eps, p.y, p.z)),
      2*eps,
      this.height(new Vec3(p.x, p.y, p.z-eps)) - this.height(new Vec3(p.x, p.y, p.z+eps))
    ).normalizeMutable()
  }
}