import { Vec2, Vec3 } from 'src/shared/libs/vectors'

import { Planet } from 'src/core/planet'

import ITerrainSampler from './ITerrainSampler'
import { AutoDiff3 } from 'src/shared/libs/AutoDiff'


function pyramid(x: Vec2) {
  const f = Vec2.ONE.subMutable(x.fract().mulMutable(2).subMutable(Vec2.ONE).abs());
  return Math.min(f.x,f.y);
}

/** Генератор ландшафта в виде пирамид на сфере, выстроенных по сферическим координатам */
export class SphericalPyramidsTerrain implements ITerrainSampler {
  private _planet: Planet

  H_SCALE = 1100.
  W_SCALE = 1500.
  MAX_TRN_ELEVATION = this.H_SCALE

  constructor(planet: Planet) {
    this._planet = planet
  }

  lonLatAlt(p: Vec3): Vec3 {
    const r = p.sub(this._planet.center);
    const phi = Math.atan2(r.y, r.x);
    const theta = Math.atan2(Math.sqrt(r.x*r.x + r.y*r.y), r.z);
    const alt = r.length() - this._planet.radius;
    return new Vec3(phi, theta, alt);
  }

  altitude(p: Vec3): number {
    const r = p.sub(this._planet.center)
    return r.length() - this._planet.radius
  }

  height(p: Vec3): number {
    const lla = this.lonLatAlt(p)
    return this.H_SCALE*pyramid(lla.xy.mul(360./Math.PI))
  }
  
  heightNormal(p: Vec3): AutoDiff3 {
    return new AutoDiff3(this.height(p), this.normal(p))
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