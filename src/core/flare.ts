import { Vec3 } from "src/shared/libs/vectors";
import { isKeyPress } from "src/shared/libs/keyboard";
import { rad } from "src/shared/libs/mathutils";

import { Camera } from "./camera";
import { Planet } from "./planet";

const KEY_F = 70;

/** 
 * Класс для управления световой ракетой
 * Используем один и тот же объект для повторного запуска ракеты
 */
export class Flare {
  private _planet: Planet;

  /** Положение ракеты */
  position: Vec3;
  /** Скорость ракеты */
  velocity: Vec3 = Vec3.ZERO;
  /** Начальная скорость при запуске, м/с */
  initialSpeed = 100;
  /** Направление начального импульса */
  initialDirection: Vec3 = new Vec3(0., Math.sin(rad(15)), -Math.cos(rad(15)));
  /** Видимость ракеты */
  isVisible: boolean = false;
  /** Интенсивность свечения ракеты */
  light: Vec3;
  /** Ссылка на экземпляр камеры, для отслеживания положения */
  readonly camera: Camera;

  constructor(cam: Camera, planet: Planet, light: Vec3 = new Vec3(100,100,100)) {
    this.camera = cam;
    this._planet = planet;
    this.position = this.camera.position.copy();
    this.light = light
  }

  update(time: number, timeDelta: number) {
    if(this.isVisible) {
      const rn = this.position.sub(this._planet.center).normalize();
      this.position.addMutable(this.velocity.mul(timeDelta));
      this.velocity.subMutable(rn.mul(this._planet.g*timeDelta));
      // если упала на поверхность, то погасла
      const alt = this.camera.tSampler.lonLatAlt(this.position).z;
      const height = alt - this.camera.tSampler.height(this.position);
      if(height < 0) {
        this.isVisible = false;
      }
      return;
    }
    if(isKeyPress(KEY_F)>0) {
      // запуск ракеты, если предыдущая уже погасла
      this.isVisible = true;
      this.position = this.camera.position.add(this.camera.orientation.rotate(Vec3.I));
      this.velocity = this.camera.velocity.add(this.camera.orientation.rotate(this.initialDirection).mul(this.initialSpeed));
    }
  }
}